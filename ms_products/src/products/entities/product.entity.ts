import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';

@Entity()
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('int')
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

  @Column() 
  builderImage: string;
}