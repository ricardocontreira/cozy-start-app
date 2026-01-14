import { Link } from "react-router-dom";
import { Brain, Sparkles, Upload, Users, Check, Shield, Zap, ChevronRight, TrendingUp, Clock, Target } from "lucide-react";
import { FinLarLogo } from "@/components/FinLarLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ThemeToggle } from "@/components/ThemeToggle";

const aiFeatures = [
  {
    icon: Upload,
    title: "Importação com IA",
    description:
      "Upload de faturas que identifica gastos automaticamente. Suporte a PDF, CSV e Excel das principais operadoras de cartão.",
  },
  {
    icon: Brain,
    title: "Categorização Automática",
    description:
      "Ao subir faturas (PDF, CSV e Excel), a IA identifica nomes, valores e datas, atribuindo categorias instantaneamente.",
  },
  {
    icon: Sparkles,
    title: "Aprendizado Contínuo",
    description:
      "Se você alterar a categoria de uma despesa (ex: de 'Outros' para 'Lazer'), o FinLar aprende esse padrão e aplicará automaticamente nos próximos uploads para toda a casa.",
  },
  {
    icon: Users,
    title: "Gestão Colaborativa",
    description:
      "Tudo funciona em sincronia para todos os membros da 'Casa'. Adicione familiares e compartilhem o controle financeiro.",
  },
  {
    icon: Target,
    title: "Planejamento de Metas",
    description:
      "Defina seus objetivos, estabeleça um capital inicial e um prazo. O FinLar calcula automaticamente o aporte mensal necessário para você realizar seus sonhos.",
  },
];

const benefits = [
  "IA que categoriza gastos",
  "Aprendizado de categorias personalizado",
  "Planejamento de metas financeiras",
  "Membros ilimitados",
  "Projeções de parcelamentos",
  "Suporte a múltiplos cartões",
  "Dark mode",
  "Dados 100% seguros",
];

const faqItems = [
  {
    question: "Meus dados financeiros estão seguros?",
    answer:
      "Sim! Utilizamos criptografia de ponta a ponta e seus dados são armazenados em servidores seguros. Não compartilhamos informações com terceiros.",
  },
  {
    question: "Como funciona a IA de categorização?",
    answer:
      "Ao fazer upload de uma fatura, nossa IA analisa as descrições das transações e atribui categorias automaticamente. Quando você corrige uma categoria, o sistema aprende e aplica a mesma classificação em transações futuras.",
  },
  {
    question: "Posso adicionar familiares?",
    answer: "Sim! Você pode convidar membros ilimitados para sua 'Casa'. Basta compartilhar o código de convite.",
  },
  {
    question: "Quais formatos de fatura são aceitos?",
    answer: "Atualmente suportamos arquivos PDF, CSV e Excel (.xlsx).",
  },
  {
    question: "Posso cancelar a qualquer momento?",
    answer: "Sim, não há fidelidade. Você pode cancelar sua assinatura a qualquer momento sem custos adicionais.",
  },
  {
    question: "Como funciona o período de teste?",
    answer: "Ao se cadastrar, você ganha 7 dias grátis para testar todas as funcionalidades do FinLar Pro. Não é necessário cartão de crédito para começar. Você pode assinar a qualquer momento durante ou após o período de teste.",
  },
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header Fixo */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FinLarLogo size="lg" />
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild>
              <Link to="/auth">Entrar</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
        <div className="container mx-auto px-4 py-12 md:py-20 relative">
          <div className="max-w-3xl mx-auto text-center">
            {/* Trial Badge */}
            <div className="inline-flex items-center gap-2 bg-success/10 text-success px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Clock className="w-4 h-4" />
              7 dias grátis para testar
            </div>
            
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6 ml-2">
              <Zap className="w-4 h-4" />
              Inteligência Artificial integrada
            </div>
            
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
              Você no controle das suas finanças
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-6 max-w-2xl mx-auto">
              Gerencie as finanças da sua casa de forma inteligente. Com IA que aprende seus hábitos e categoriza gastos
              automaticamente.
            </p>
            <p className="text-base text-primary font-medium mb-8 max-w-2xl mx-auto">
              🎯 Saia do escuro e planeje sua reserva de emergência, a compra de um carro ou a viagem dos sonhos com cálculos precisos.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild className="text-base">
                <Link to="/auth?mode=signup">
                  Começar teste grátis
                  <ChevronRight className="w-5 h-5 ml-1" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="text-base">
                <a href="#pricing">Ver planos</a>
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground mt-4">
              Sem cartão de crédito. Cancele a qualquer momento.
            </p>

            {/* Video Demo */}
            <div className="mt-10 max-w-4xl mx-auto">
              <div className="relative rounded-xl overflow-hidden shadow-2xl border border-border bg-card">
                <div className="aspect-video">
                  <iframe
                    src="https://www.loom.com/embed/b077740e85d64b40bac6af155ad5e6c1?hideEmbedTopBar=true&hide_share=true&hide_owner=true"
                    frameBorder="0"
                    allowFullScreen
                    className="absolute inset-0 w-full h-full"
                    title="FinLar Demo"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Seção de IA */}
      <section className="py-12 md:py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10 md:mb-14">
            <div className="inline-flex items-center gap-2 bg-success/10 text-success px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Clock className="w-4 h-4" />
              Todas as funcionalidades inclusas nos 7 dias grátis
            </div>
            <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-4">Inteligência que Aprende com Você</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Nossa IA trabalha para você, categorizando gastos, aprendendo seus padrões financeiros e ajudando você a planejar suas metas.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto">
            {aiFeatures.map((feature, index) => (
              <Card key={index} className="bg-card border-border hover:border-primary/50 transition-colors">
                <CardHeader className="pb-2">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-12 md:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10 md:mb-14">
            <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-4">Plano simples, sem surpresas</h2>
            <p className="text-muted-foreground">Tudo que você precisa por um preço justo.</p>
          </div>
          <Card className="max-w-md mx-auto border-2 border-primary relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-1 text-sm font-medium rounded-bl-lg">
              7 dias grátis
            </div>
            <CardHeader className="text-center pt-8 pb-4">
              <CardTitle className="text-xl mb-2">Plano Completo</CardTitle>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl md:text-5xl font-bold text-foreground">R$ 19,99</span>
                <span className="text-muted-foreground">/mês</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Após o período de teste gratuito
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <ul className="space-y-3">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-primary" />
                    </div>
                    <span className="text-sm text-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
              <Button className="w-full" size="lg" asChild>
                <Link to="/auth?mode=signup">
                  Começar teste grátis
                  <TrendingUp className="w-5 h-5 ml-2" />
                </Link>
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Sem cartão de crédito para começar
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 md:py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10 md:mb-14">
            <div className="inline-flex items-center gap-2 text-primary mb-4">
              <Shield className="w-5 h-5" />
              <span className="font-medium">Dúvidas frequentes</span>
            </div>
            <h2 className="text-2xl md:text-4xl font-bold text-foreground">Perguntas Frequentes</h2>
          </div>
          <div className="max-w-2xl mx-auto">
            <Accordion type="single" collapsible className="space-y-2">
              {faqItems.map((item, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="bg-card border border-border rounded-lg px-4"
                >
                  <AccordionTrigger className="text-left text-sm md:text-base hover:no-underline">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-sm">{item.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2">
              <FinLarLogo size="md" />
            </div>
            <p className="text-sm text-muted-foreground">Seu dinheiro, do jeito certo.</p>
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} FinLar. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
