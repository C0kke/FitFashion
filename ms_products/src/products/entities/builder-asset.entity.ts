import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Product } from './product.entity';

export enum ViewType {FRONT = 'front', BACK = 'back', FLAT = 'flat',}

@Entity()
export class BuilderAsset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  imageUrl: string; // Link de Cloudinary

  @Column({ type: 'enum', enum: ViewType, default: ViewType.FRONT })
  viewType: ViewType;

  @ManyToOne(() => Product, (product) => product.builderAssets, {
    onDelete: 'CASCADE', // Si borras el producto, se van las fotos
  })
  product: Product;
}