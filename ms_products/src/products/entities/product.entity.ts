import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { BuilderAsset } from './builder-asset.entity';

@Entity()
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column('text')
  description: string;

  @Column('text', { array: true }) 
  categories: string[];

  @Column('text', { array: true })
  styles: string[];

  @Column({ type: 'int', default: 1 })
  layerIndex: number;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @Column('text', { array: true })
  galleryImages: string[];

  // Relación con los assets del builder
  @OneToMany(() => BuilderAsset, (asset) => asset.product, {
    cascade: true, // Guarda producto + assets de una sola vez
    eager: true,   // Trae los assets siempre automáticamente
  })
  builderAssets: BuilderAsset[];
}