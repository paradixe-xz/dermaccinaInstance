// Express
import { Request, Response, NextFunction } from 'express';

// Helpers
import { ResponseHelper } from '../helpers/responseHelper';
import { convertToTwoCharCode, removeSymbolRegex } from '../helpers/dataDebugging';
import { connectMongo } from '../config/database';
import { config } from '../config';

export class InfoController {
  static cleanLeadDataByResmsg(leadData: any, resmsg: string) {
    const fields = ['country', 'email', 'phone_number', 'city', 'address', 'state', 'zip', 'zip4', 'comment'];
    for (const field of fields) {
      if (resmsg.toLowerCase().includes(field)) {
        leadData[field] = '';
      }
    }
  }

  static async createLead(req: Request, res: Response, next: NextFunction) {
    try {
      const info = req.body;
      console.log('Received data:', JSON.stringify(info, null, 2));

      // Extraer información de data_collection_results
      const dataCollection = info.data.analysis?.data_collection_results;

      if (!dataCollection) {
        console.log("No data collection")
        return ResponseHelper.error(res, 'No data_collection_results found in request', 400);
      }

      // Extraer nombre y teléfono
      const customerPhone = dataCollection.customer_phone?.value || "";
      const customerEmail = dataCollection.customer_email?.value || "";
      const customerCountry = dataCollection.customer_country?.value || "";
      const customerAddress = dataCollection.customer_address?.value || "";
      const customerZip = dataCollection.customer_zip?.value || "";
      const customerZip4 = dataCollection.customer_zip4?.value || "";
      const customerState = dataCollection.customer_state?.value || "";


      // Preparar datos para guardar y enviar
      const leadData = {
        name: dataCollection.customer_name?.value,
        last_name: dataCollection.customer_last_name?.value,
        media: "WEB",
        // phone_number: "",
        phone_number: removeSymbolRegex("-", customerPhone),
        entervia: "9548092011",
        email: customerEmail,
        city: dataCollection.customer_city?.value || "",
        address: customerAddress,
        state: convertToTwoCharCode(customerState),
        zip: customerZip,
        zip4: customerZip4,
        country: convertToTwoCharCode(customerCountry),
        comment: "",
        addInfo: {
          tscReference: "DEFAULT",
          data: [
            {
              tscReferenceCode: "TSC_manchas",
              tscReferenceValue: dataCollection?.has_manchas?.value
            },
            {
              tscReferenceCode: "TSC_tamaño_manchas",
              tscReferenceValue: dataCollection?.tamaño_manchas?.value
            },
            {
              tscReferenceCode: "TSC_skin_condition",
              tscReferenceValue: dataCollection?.skin_condition?.value
            },
            {
              tscReferenceCode: "TSC_has_tried_treatments",
              tscReferenceValue: dataCollection?.has_tried_treatments?.value
            },
            {
              tscReferenceCode: "TSC_color_manchas",
              tscReferenceValue: dataCollection?.color_manchas?.value
            },
          ]
        }
      };

      const infoLeadDB = {
        ...leadData,
        status: dataCollection.call_successful
      };

      // Guardar en MongoDB antes de enviar a la API externa
      try {
        const db = await connectMongo();
        await db.collection('leads').insertOne(infoLeadDB);
        console.log('Lead saved to MongoDB');
      } catch (mongoErr) {
        console.error('Error saving lead to MongoDB:', mongoErr);
        // Puedes decidir si continuar o retornar error aquí
      }

      // Validar el estado de la llamada antes de enviar a la API externa
      const callStatus = dataCollection.call_successful?.toLowerCase();
      if (callStatus === 'error' || callStatus === 'failed') {
        console.log('Call status is error or failed, not sending to external API');
        return res.status(200).json({ message: 'Lead saved to database only due to call status', status: callStatus });
      }

      console.log('Sending lead data:', JSON.stringify(leadData, null, 2));

      // Enviar datos a la API externa
      const response = await fetch(`${config.tscApi.url}/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.tscApi.token}`
        },
        body: JSON.stringify(leadData)
      });


      if (!response.ok) {
        let errorJson: any = {};
        try {
          errorJson = await response.json();
        } catch (e) {
          errorJson = { resmsg: '' };
        }
        const resmsg = errorJson?.resmsg || '';
        InfoController.cleanLeadDataByResmsg(leadData, resmsg);
        console.error('TSC API Error:', response.status, resmsg);

        // Reintentar una vez con los campos limpiados
        const retryResponse = await fetch(`${config.tscApi.url}/leads`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.tscApi.token}`
          },
          body: JSON.stringify(leadData)
        });

        if (!retryResponse.ok) {
          // Limpiar address, state, country, comment y reintentar una vez más
          leadData.address = '';
          leadData.state = '';
          leadData.country = '';
          leadData.comment = '';

          const thirdResponse = await fetch(`${config.tscApi.url}/leads`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${config.tscApi.token}`
            },
            body: JSON.stringify(leadData)
          });

          if (!thirdResponse.ok) {
            const thirdErrorJson = await thirdResponse.json().catch(() => ({}));
            console.error('TSC API Final Error:', thirdErrorJson);
            return res.status(500).json({ error: 'Failed to send lead to TSC API after 3 attempts', apiResponse: thirdErrorJson });
          }

          const thirdTscResponse = await thirdResponse.json();
          console.log('TSC API Third Attempt Response:', thirdTscResponse);
          return res.status(200).json({ retried: 2, tscResponse: thirdTscResponse });
        }

        const retryTscResponse = await retryResponse.json();
        console.log('TSC API Retry Response:', retryTscResponse);
        return res.status(200).json({ retried: true, tscResponse: retryTscResponse });
      }

      const tscResponse = await response.json();
      console.log('TSC API Response:', tscResponse);

      return res.status(200);

    } catch (error) {
      console.error('Error processing lead:', error);
      next(error);
    }
  }

  static async getLeads(req: Request, res: Response, next: NextFunction) {
    try {
      // Verificar si se proporcionó la contraseña
      const { pass } = req.query;

      if (!pass) {
        return ResponseHelper.error(res, 'No se proporcionó la contraseña', 401);
      }

      // Verificar si la contraseña es correcta
      if (pass !== config.passGet) {
        return ResponseHelper.error(res, 'No se proporcionó la contraseña', 401);
      }

      const db = await connectMongo();
      const leads = await db.collection('leads').find({}).toArray();
      return res.status(200).json(leads);
    } catch (error) {
      console.error('Error fetching leads:', error);
      return ResponseHelper.error(res, 'Error fetching leads from database', 500);
    }
  }
}