import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({ tableName: 'leads' })
export class Lead extends Model {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  })
  declare id: number;

  @Column(DataType.STRING)
  declare name: string;

  @Column(DataType.STRING)
  declare last_name: string;

  @Column(DataType.STRING)
  declare phone_number: string;

  @Column(DataType.STRING)
  declare email: string;

  @Column(DataType.STRING)
  declare address: string;

  @Column(DataType.STRING)
  declare city: string;

  @Column(DataType.STRING)
  declare state: string;

  @Column(DataType.STRING)
  declare zip: string;

  @Column(DataType.STRING)
  declare zip4: string;

  @Column(DataType.STRING)
  declare country: string;

  @Column(DataType.TEXT)
  declare comment: string;

  @Column(DataType.JSONB)
  declare addInfo: Record<string, any>;

  @Column(DataType.STRING)
  declare status: string;

  @Column({
    type: DataType.DATE,
    field: 'created_at'
  })
  declare createdAt: Date;

  @Column({
    type: DataType.DATE,
    field: 'updated_at'
  })
  declare updatedAt: Date;
}
