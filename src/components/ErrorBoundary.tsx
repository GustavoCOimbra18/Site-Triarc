import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State;
  public props: Props;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in boundary:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '40px 20px', 
          backgroundColor: '#070707', 
          color: '#ef4444', 
          fontFamily: 'monospace', 
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center'
        }}>
          <div style={{ maxWidth: '600px', width: '100%', backgroundColor: '#0d0d0d', padding: '30px', borderRadius: '16px', border: '1px solid #ef4444/30', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '15px', color: '#fca5a5' }}>
              Erro Crítico de Inicialização (TRIARC)
            </h2>
            <p style={{ color: '#a8a29e', fontSize: '13px', marginBottom: '20px' }}>
              Ocorreu um erro ao carregar os módulos ou renderizar a página. Veja os detalhes abaixo:
            </p>
            <pre style={{ 
              textAlign: 'left',
              whiteSpace: 'pre-wrap', 
              backgroundColor: '#020202', 
              padding: '15px', 
              borderRadius: '8px', 
              border: '1px solid #262626',
              fontSize: '11px',
              color: '#f87171',
              maxHeight: '300px',
              overflowY: 'auto',
              marginBottom: '20px'
            }}>
              {this.state.error?.stack || this.state.error?.toString()}
            </pre>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button 
                onClick={() => {
                  try {
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.reload();
                  } catch (e) {
                    window.location.reload();
                  }
                }}
                style={{ 
                  padding: '10px 18px', 
                  backgroundColor: '#ef4444', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: '8px', 
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '12px'
                }}
              >
                Limpar Cache e Recarregar
              </button>
              <button 
                onClick={() => window.location.reload()}
                style={{ 
                  padding: '10px 18px', 
                  backgroundColor: '#262626', 
                  color: '#e5e5e5', 
                  border: '1px solid #404040', 
                  borderRadius: '8px', 
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '12px'
                }}
              >
                Tentar Recarregar
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
