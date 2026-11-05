import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Lock, RotateCcw, BarChart3, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { GhlFormEmbed } from '@/components/shared/GhlFormEmbed';
import { GHL_FORMS } from '@/config/ghl';

const ROASCalculator = () => {
    // Steps: intro -> spend -> revenue -> calculating -> gate -> result
    const [step, setStep] = useState<'intro' | 'spend' | 'revenue' | 'calculating' | 'gate' | 'result'>('intro');

    // Data
    const [spend, setSpend] = useState<number>(5000);
    const [revenue, setRevenue] = useState<number>(25000);

    // Results
    const [roas, setRoas] = useState<number>(0);
    const [profit, setProfit] = useState<number>(0);

    const nextStep = () => {
        if (step === 'intro') setStep('spend');
        else if (step === 'spend') setStep('revenue');
        else if (step === 'revenue') {
            setStep('calculating');
            setTimeout(() => {
                const calculatedRoas = spend > 0 ? revenue / spend : 0;
                const calculatedProfit = revenue - spend;
                setRoas(calculatedRoas);
                setProfit(calculatedProfit);
                setStep('gate');
            }, 1500);
        }
    };

    const reset = () => {
        setStep('intro');
        setSpend(5000);
        setRevenue(25000);
    };

    const getStepNumber = () => {
        if (step === 'spend') return '01';
        if (step === 'revenue') return '02';
        return '00';
    };

    return (
        <Card className="bg-white border-2 border-black p-0 overflow-hidden max-w-3xl mx-auto my-16 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] rounded-none relative min-h-[500px] flex flex-col font-sans not-prose">

            {/* Header / Meta */}
            <div className="flex justify-between items-center p-6 border-b-2 border-dashed border-zinc-200">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-revgreen rounded-full animate-pulse"></div>
                    <span className="text-xxs font-mono uppercase tracking-widest text-zinc-400">System: ROAS_Audit_v2.1</span>
                </div>
                {['spend', 'revenue'].includes(step) && (
                    <span className="text-xl font-black font-mono text-zinc-200">{getStepNumber()}/02</span>
                )}
            </div>

            <div className="flex-1 flex flex-col justify-center p-8 md:p-16 relative">

                {/* 1. INTRO */}
                {step === 'intro' && (
                    <div className="text-center space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <div className="inline-block relative">
                            <h3 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-black leading-[0.9]">
                                Auditoria<br />
                                <span className="text-zinc-500">Fluxo de Caixa.</span>
                            </h3>
                            <div className="absolute -top-4 -right-8">
                                <BarChart3 className="w-8 h-8 text-revgreen" />
                            </div>
                        </div>

                        <p className="text-zinc-500 text-lg md:text-xl font-medium leading-relaxed max-w-md mx-auto">
                            Descubra se suas campanhas são um investimento ou um custo. Matemática pura.
                        </p>

                        <Button
                            onClick={nextStep}
                            className="group relative px-8 h-16 bg-black text-white font-black text-xl uppercase tracking-widest rounded-none overflow-hidden transition-all hover:bg-revgreen hover:text-black"
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                Iniciar Análise <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </span>
                        </Button>
                    </div>
                )}

                {/* 2. SPEND */}
                {step === 'spend' && (
                    <div className="space-y-12 animate-in fade-in slide-in-from-right-12 duration-500">
                        <div>
                            <span className="text-xs font-bold text-revgreen uppercase tracking-[0.2em] mb-4 block">Métrica 01</span>
                            <h3 className="text-3xl md:text-4xl font-black uppercase text-black leading-tight max-w-lg">
                                Qual seu Investimento<br />Mensal (Ads)?
                            </h3>
                        </div>

                        <div className="space-y-8">
                            <div className="relative group">
                                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-4xl font-black text-zinc-300 group-focus-within:text-black transition-colors">R$</span>
                                <input
                                    type="number"
                                    value={spend}
                                    onChange={(e) => setSpend(Number(e.target.value))}
                                    className="w-full pl-16 py-4 text-7xl font-black text-black outline-none bg-transparent border-b-4 border-zinc-100 focus:border-black transition-all placeholder-zinc-200"
                                    autoFocus
                                />
                            </div>
                            <Slider
                                value={[spend]}
                                min={100}
                                max={1000000}
                                step={100}
                                onValueChange={(vals) => setSpend(vals[0])}
                                className="[&_.bg-primary]:bg-black [&_.bg-primary]:w-4 [&_.bg-primary]:h-4 [&_.bg-primary]:border-2 [&_.bg-primary]:border-white [&_.bg-primary]:shadow-sm [&_.border-primary]:border-black"
                            />
                        </div>

                        <Button onClick={nextStep} className="w-24 h-24 rounded-full bg-black text-white hover:bg-revgreen hover:text-black transition-all absolute bottom-8 right-8 flex items-center justify-center shadow-sm hover:scale-105">
                            <ArrowRight className="w-8 h-8" />
                        </Button>
                    </div>
                )}

                {/* 3. REVENUE */}
                {step === 'revenue' && (
                    <div className="space-y-12 animate-in fade-in slide-in-from-right-12 duration-500">
                        <div>
                            <span className="text-xs font-bold text-revgreen uppercase tracking-[0.2em] mb-4 block">Métrica 02</span>
                            <h3 className="text-3xl md:text-4xl font-black uppercase text-black leading-tight max-w-lg">
                                Qual a Receita<br />Gerada?
                            </h3>
                        </div>

                        <div className="space-y-8">
                            <div className="relative group">
                                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-4xl font-black text-zinc-300 group-focus-within:text-black transition-colors">R$</span>
                                <input
                                    type="number"
                                    value={revenue}
                                    onChange={(e) => setRevenue(Number(e.target.value))}
                                    className="w-full pl-16 py-4 text-7xl font-black text-black outline-none bg-transparent border-b-4 border-zinc-100 focus:border-black transition-all placeholder-zinc-200"
                                    autoFocus
                                />
                            </div>
                            <Slider
                                value={[revenue]}
                                min={0}
                                max={5000000}
                                step={500}
                                onValueChange={(vals) => setRevenue(vals[0])}
                                className="[&_.bg-primary]:bg-black [&_.bg-primary]:w-4 [&_.bg-primary]:h-4 [&_.bg-primary]:border-2 [&_.bg-primary]:border-white [&_.bg-primary]:shadow-sm [&_.border-primary]:border-black"
                            />
                        </div>

                        <div className="flex gap-4 absolute bottom-8 right-8">
                            <Button variant="ghost" onClick={() => setStep('spend')} className="h-14 w-14 rounded-full border border-zinc-200 p-0 text-zinc-400 hover:text-black hover:border-black">
                                <RotateCcw className="w-5 h-5" />
                            </Button>
                            <Button onClick={nextStep} className="w-24 h-24 rounded-full bg-black text-white hover:bg-revgreen hover:text-black transition-all flex items-center justify-center shadow-sm hover:scale-105">
                                <CheckCircle2 className="w-8 h-8 text-white group-hover:text-black" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* 4. CALCULATING */}
                {step === 'calculating' && (
                    <div className="text-center space-y-8 animate-in zoom-in-95 duration-500 h-full flex flex-col justify-center items-center">
                        <div className="relative">
                            <div className="w-24 h-24 border-8 border-zinc-100 "></div>
                            <div className="w-24 h-24 border-8 border-black border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                        </div>
                        <h3 className="text-2xl font-black uppercase tracking-widest animate-pulse">Auditando...</h3>
                    </div>
                )}

                {/* 5. GATE */}
                {step === 'gate' && (
                    <div className="h-full flex flex-col justify-center animate-in fade-in slide-in-from-bottom-8 duration-500">
                        <div className="w-12 h-12 bg-black text-white flex items-center justify-center mb-6">
                            <Lock className="w-6 h-6" />
                        </div>

                        <h3 className="text-4xl font-black uppercase tracking-tight mb-2 max-w-md leading-none">
                            Diagnóstico<br />Pronto.
                        </h3>
                        <p className="text-zinc-500 text-lg mb-8 max-w-xs">
                            Desbloqueie o resultado da sua auditoria de mídia paga.
                        </p>

                        <div className="w-full max-w-sm">
                            <GhlFormEmbed
                                formId={GHL_FORMS.calculadora}
                                title="Desbloquear Auditoria"
                                params={{
                                    calculadora: 'roas',
                                    calculadora_resultado: JSON.stringify({ spend, revenue, roas, profit }),
                                }}
                                minHeight={320}
                                onSubmitted={() => setStep('result')}
                            />
                        </div>
                    </div>
                )}

                {/* 6. RESULT */}
                {step === 'result' && (
                    <div className="h-full flex flex-col animate-in zoom-in-95 duration-500">
                        <div className="flex items-start justify-between mb-8">
                            <div>
                                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1 block">ROAS Multiplier</span>
                                <h3 className="text-6xl md:text-7xl font-black text-black tracking-tighter leading-none">
                                    {roas.toFixed(2)}x
                                </h3>
                            </div>
                            <div className="hidden md:block">
                                <div className={`w-16 h-16 flex items-center justify-center ${roas >= 3 ? 'bg-revgreen' : 'bg-red-500'}`}>
                                    <CheckCircle2 className="w-8 h-8 text-black" />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-x-8 gap-y-8 flex-1 content-center border-t border-b border-zinc-100 py-8 my-4">
                            <div>
                                <span className="text-xxs font-bold text-zinc-400 uppercase tracking-widest block mb-2">Status</span>
                                <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 ${roas >= 3 ? 'bg-revgreen' : 'bg-red-500'}`}></div>
                                    <span className="font-bold text-xl">{roas >= 3 ? 'Escalável' : 'Critico'}</span>
                                </div>
                            </div>
                            <div>
                                <span className="text-xxs font-bold text-zinc-400 uppercase tracking-widest block mb-2">Lucro Líquido</span>
                                <span className={`font-black font-mono text-2xl ${profit > 0 ? 'text-black' : 'text-red-500'}`}>
                                    R$ {profit.toLocaleString('pt-BR', { notation: 'compact' })}
                                </span>
                            </div>
                            <div>
                                <span className="text-xxs font-bold text-zinc-400 uppercase tracking-widest block mb-2">Investimento</span>
                                <span className="font-black font-mono text-2xl">R$ {spend.toLocaleString('pt-BR', { notation: 'compact' })}</span>
                            </div>
                            <div>
                                <span className="text-xxs font-bold text-zinc-400 uppercase tracking-widest block mb-2">Margem</span>
                                <span className="font-black font-mono text-2xl">
                                    {revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : 0}%
                                </span>
                            </div>
                        </div>

                        <div className="mt-auto pt-4">
                            <Button
                                onClick={reset}
                                variant="outline"
                                className="w-full border-black text-black font-bold uppercase tracking-widest hover:bg-black hover:text-white rounded-none h-12"
                            >
                                Nova Auditoria
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
};

export default ROASCalculator;
