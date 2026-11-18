import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 p-6">
                    <div className="max-w-2xl w-full bg-white border border-zinc-200 p-8 shadow-sm">
                        <div className="flex items-center gap-4 text-red-600 mb-6">
                            <div className="w-12 h-12 bg-red-50 flex items-center justify-center shrink-0">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-zinc-900">Algo deu errado</h1>
                                <p className="text-sm font-medium opacity-80">A aplicação encontrou um erro inesperado.</p>
                            </div>
                        </div>

                        <div className="bg-zinc-900 p-4 overflow-x-auto mb-6">
                            <code className="text-xs font-mono text-red-400 block mb-2">
                                {this.state.error && this.state.error.toString()}
                            </code>
                            <pre className="text-xxs font-mono text-zinc-500 whitespace-pre-wrap">
                                {this.state.errorInfo && this.state.errorInfo.componentStack}
                            </pre>
                        </div>

                        <div className="flex justify-end gap-3">
                            <Button
                                variant="outline"
                                onClick={() => window.location.href = '/'}
                                className="gap-2"
                            >
                                <Home className="w-4 h-4" />
                                Voltar ao Início
                            </Button>
                            <Button
                                onClick={() => window.location.reload()}
                                className="bg-black hover:bg-zinc-800 text-white"
                            >
                                Tentar Novamente
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
