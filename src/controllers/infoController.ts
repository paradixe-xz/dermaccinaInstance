// Express
import { Request, Response, NextFunction } from 'express';

// Helpers
import { ResponseHelper } from '../helpers/responseHelper';
import { convertToTwoCharCode, removeSymbolRegex } from '../helpers/dataDebugging';
import { sequelize } from '../config/database';
import { config } from '../config';
import { Lead } from '../models/lead.model';

// Interfaces
interface TscResponse {
  rescode: string;
  resmsg: string;
  leadnum?: string;
  ordernum?: string;
  [key: string]: any;
}

interface LeadData {
  name: string;
  last_name: string;
  media: string;
  phone_number: string;
  entervia: string;
  email: string;
  city: string;
  address: string;
  state: string;
  zip: string;
  zip4: string;
  country: string;
  comment: string;
  addInfo: {
    tscReference: string;
    data: Array<{
      tscReferenceCode: string;
      tscReferenceValue: any;
    }>;
  };
  [key: string]: any;
}

interface OrderData {
  createBy: string;
  seller: string;
  sellerName: string;
  company: string;
  department: string;
  ordenDate: string;
  leadnum: string;
  customerName: string;
  customerLastname: string;
  direction: {
    address: string;
    city: string;
    state: string;
    zip: string;
    zip4: string;
    country: string;
    urbanization: string;
  };
  phone1: string;
  phone2: string;
  comment: string;
  payterm: string;
  deliveryDate: string;
  shipvia: string;
  subTotal: number;
  total: number;
  saleTax: number;
  taxes: number;
  paid: number;
  discount: number;
  discountAmount: number;
  detail: Array<{
    productCode: string;
    packageCode: string;
    qty: number;
    total: number;
    pricePerUnit: number;
  }>;
  [key: string]: any;
}

interface PaymentData {
  ordernum: string;
  leadnum: string;
  amount: number;
  paymentMethod: string;
  [key: string]: any;
}

export class InfoController {
  private static async callTscApi(endpoint: string, data: any): Promise<TscResponse | null> {
    try {
      const response = await fetch(`${config.tscApi.url}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.tscApi.token}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.error('TSC API Error:', response.status, error);
        return null;
      }

      return await response.json() as TscResponse;
    } catch (error) {
      console.error('Error calling TSC API:', error);
      return null;
    }
  }

  private static async createOrder(leadData: any, leadNum: string): Promise<TscResponse | null> {
    if (!leadData || !leadNum) return null;

    const orderData: OrderData = {
      createBy: "API",
      seller: "API",
      sellerName: "API User",
      company: "90001",
      department: "90001",
      ordenDate: new Date().toISOString().split('T')[0],
      leadnum: leadNum,
      customerName: leadData.name,
      customerLastname: leadData.last_name,
      direction: {
        address: leadData.address || "",
        city: leadData.city || "",
        state: leadData.state || "",
        zip: leadData.zip || "",
        zip4: leadData.zip4 || "",
        country: leadData.country || "",
        urbanization: ""
      },
      phone1: leadData.phone_number,
      phone2: "",
      comment: leadData.comment || "Order created from lead",
      payterm: "PREPAID",
      deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
      shipvia: "USPS",
      subTotal: 0,
      total: 0,
      saleTax: 0,
      taxes: 0,
      paid: 0,
      discount: 0,
      discountAmount: 0,
      detail: []
    };

    return this.callTscApi('order', orderData);
  }

  private static async createPayment(ordernum: string, leadnum: string): Promise<TscResponse | null> {
    if (!ordernum || !leadnum) return null;

    const paymentData: PaymentData = {
      ordernum,
      leadnum,
      amount: 0, // This should be set based on your order total
      paymentMethod: "CREDIT_CARD" // Default payment method
    };

    return this.callTscApi('payment', paymentData);
  }

  private static cleanLeadDataByResmsg(leadData: LeadData, resmsg: string) {
    // Clean data based on error message
    if (resmsg.includes('address')) leadData.address = '';
    if (resmsg.includes('state')) leadData.state = '';
    if (resmsg.includes('country')) leadData.country = '';
    if (resmsg.includes('comment')) leadData.comment = '';
  }

  static async createLead(req: Request, res: Response, next: NextFunction) {
    try {
      const info = req.body;
      console.log('Received data:', JSON.stringify(info, null, 2));

      // Extract information from data_collection_results
      const dataCollection = info.data?.analysis?.data_collection_results;

      if (!dataCollection) {
        console.log("No data collection found");
        return ResponseHelper.error(res, 'No data_collection_results found in request', 400);
      }

      // Prepare lead data
      const leadData: LeadData = {
        name: dataCollection.customer_name?.value || "Unknown",
        last_name: dataCollection.customer_last_name?.value || "",
        media: "WEB",
        phone_number: removeSymbolRegex("-", dataCollection.customer_phone?.value || ""),
        entervia: "9548092011",
        email: dataCollection.customer_email?.value || "",
        city: dataCollection.customer_city?.value || "",
        address: dataCollection.customer_address?.value || "",
        state: convertToTwoCharCode(dataCollection.customer_state?.value || ""),
        zip: dataCollection.customer_zip?.value || "",
        zip4: dataCollection.customer_zip4?.value || "",
        country: convertToTwoCharCode(dataCollection.customer_country?.value || ""),
        comment: "",
        addInfo: {
          tscReference: "DEFAULT",
          data: Object.entries(dataCollection)
            .filter(([key]) => !key.startsWith('customer_'))
            .map(([key, value]: [string, any]) => ({
              tscReferenceCode: `TSC_${key}`,
              tscReferenceValue: value?.value || value
            }))
        }
      };

      // Save to PostgreSQL
      try {
        const lead = await Lead.create(leadData as any);
        console.log('Lead saved to PostgreSQL with ID:', lead.id);
      } catch (dbError) {
        console.error('Error saving lead to PostgreSQL:', dbError);
        // Continue even if database save fails
      }

      // Check call status
      const callStatus = info.data?.analysis?.call_successful?.toLowerCase();
      console.log("Call status:", callStatus);
      
      if (callStatus !== "success") {
        console.log('Call status is not success, not sending to external API');
        return res.status(200).json({ 
          message: 'Lead saved to database only due to call status', 
          status: callStatus 
        });
      }

      // Send to TSC API
      const tscResponse = await this.callTscApi('leads', leadData);
      
      if (!tscResponse) {
        return ResponseHelper.error(res, 'Failed to send lead to TSC API', 500);
      }

      let orderResponse = null;
      let paymentResponse = null;

      // Create order if lead was created successfully
      if (tscResponse.rescode === '000' && tscResponse.leadnum) {
        orderResponse = await this.createOrder(leadData, tscResponse.leadnum);
        
        // Create payment if order was created successfully
        if (orderResponse?.rescode === '000' && orderResponse.ordernum) {
          paymentResponse = await this.createPayment(
            orderResponse.ordernum,
            tscResponse.leadnum
          );
        }
      }

      return ResponseHelper.success(res, {
        message: 'Lead processed successfully',
        lead: tscResponse,
        order: orderResponse,
        payment: paymentResponse
      });

    } catch (error) {
      console.error('Error processing lead:', error);
      next(error);
    }
  }

  static async getLeads(req: Request, res: Response, next: NextFunction) {
    try {
      const leads = await Lead.findAll({
        order: [['createdAt', 'DESC']],
        limit: 100
      });
      return ResponseHelper.success(res, leads);
    } catch (error) {
      console.error('Error fetching leads:', error);
      next(error);
    }
  }
}