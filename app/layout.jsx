import './globals.css';
import { Analytics } from '@vercel/analytics/next';

export const metadata = {
  title: 'TaskGrind for Brands',
  description: 'Launch campaigns and screen real users on TaskGrind.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
