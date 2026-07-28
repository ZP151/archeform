import type { Metadata } from 'next';
import './globals.css';
import '@/components/factory-ui/factory-ui.css';
import { FactoryTheme } from '@/components/factory-ui/factory-ui';

export const metadata: Metadata = {
  title: 'Factory Pilot',
  description: 'Requirement-to-product control workspace',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><body><FactoryTheme>{children}</FactoryTheme></body></html>;
}
