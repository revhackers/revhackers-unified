import { ReactNode } from 'react';
import Header from './Header';
import Footer from './Footer';

interface PageLayoutProps {
  children: ReactNode;
  headerVariant?: 'default' | 'light';
  hideFooter?: boolean;
}

const PageLayout = ({ children, headerVariant = 'default', hideFooter = false }: PageLayoutProps) => {
  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden bg-white text-zinc-900">
      <a
        href="#conteudo-principal"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-[#00CC6A] focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-black"
      >
        Pular para o conteúdo
      </a>
      <Header variant={headerVariant} />
      <main id="conteudo-principal" className="flex-grow w-full">
        {children}
      </main>
      {!hideFooter && <Footer />}
    </div>
  );
};

export default PageLayout;
