import type { Metadata } from 'next';
import CanvasWrapper from '../components/CanvasWrapper';

export const metadata: Metadata = {
  title: 'ViTale — Hành trình Văn hoá Việt',
  description: 'Khám phá văn hoá Hà Nội qua bộ sưu tập búp bê dân tộc và nhân vật 3D AI.',
};

export default function Home() {
  return (
    <main>
      <CanvasWrapper />
    </main>
  );
}
