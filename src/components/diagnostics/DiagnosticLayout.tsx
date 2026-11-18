import React from 'react';
import { cn } from '@/lib/utils';
import PageLayout from '@/components/layout/PageLayout';
import Section from '@/components/ui/Section';

interface DiagnosticLayoutProps {
 children: React.ReactNode;
 title: string;
 subtitle: string;
 showGovernanceFooter?: boolean;
 variant?: 'light' | 'dark';
 centered?: boolean;
 hideHeader?: boolean;
}

export const DiagnosticLayout = ({
 children,
 title,
 subtitle,
 showGovernanceFooter = true,
 variant = 'light',
 centered = true,
 hideHeader = false
}: DiagnosticLayoutProps) => {
 return (
   <PageLayout>
     <style>{`
       #chat-widget, 
       #leadconnector-chat-widget, 
       .hl-chat-widget, 
       #hl-chat-widget-container,
       iframe[name="chat-widget"] { 
         display: none !important; 
       }
     `}</style>

     {/* 1. Official Black Hero Header */}
     {!hideHeader && (
       <section className="bg-black py-8 md:py-12 border-b border-zinc-900 relative overflow-hidden">
         <div className="max-w-4xl mx-auto px-6 text-center space-y-2 relative z-10">
           <p className="text-[#00CC6A] text-xs font-semibold tracking-wider uppercase">
             Diagnóstico Preditivo B2B
           </p>
           <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight">
             {title}
           </h1>
           <p className="text-xs md:text-sm text-zinc-400 max-w-xl mx-auto leading-relaxed font-normal">
             {subtitle}
           </p>
         </div>
       </section>
     )}

     {/* 2. Pure White Content Area */}
     <section className="py-8 md:py-12 bg-white min-h-[55vh] flex flex-col justify-center">
       <div className="max-w-4xl mx-auto px-6 flex flex-col items-center w-full">
         <div className={cn(
           "w-full transition-all duration-300",
           hideHeader ? "max-w-5xl" : "max-w-3xl"
         )}>
           {children}
         </div>

         {showGovernanceFooter && (
           <div className="mt-8 text-center w-full max-w-xl mx-auto border-t border-zinc-100 pt-6">
             <p className="text-xs sm:text-sm font-sans text-zinc-500 leading-relaxed font-medium">
               RevHackers GTM Engineering, Diagnóstico preditivo de receita e maturidade operacional B2B.
             </p>
           </div>
         )}
       </div>
     </section>
   </PageLayout>
 );
};
