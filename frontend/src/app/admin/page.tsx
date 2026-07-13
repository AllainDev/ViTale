import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ViTale Admin',
  robots: { index: false, follow: false },
};

export default function AdminIndexPage() {
  redirect('/admin/products');
}
