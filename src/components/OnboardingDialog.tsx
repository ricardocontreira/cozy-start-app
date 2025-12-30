import { useState, useEffect } from "react";
import { Home, CreditCard, Sparkles, Brain, ChevronRight, ChevronLeft } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";

const ONBOARDING_KEY = "finlar_has_seen_onboarding";

interface OnboardingSlide {
  icon: React.ReactNode;
  title: string;
  description: string;
  iconBg: string;
}

const slides: OnboardingSlide[] = [
  {
    icon: <Sparkles className="w-8 h-8 sm:w-12 sm:h-12" />,
    title: "Bem-vindo ao FinLar!",
    description: "Sua gestão financeira residencial começa aqui. Vamos organizar o lar juntos?",
    iconBg: "bg-primary/20 text-primary",
  },
  {
    icon: <Home className="w-8 h-8 sm:w-12 sm:h-12" />,
    title: "Sua Casa, Suas Regras",
    description:
      'Tudo no FinLar gira em torno da sua "Casa". Crie uma nova e convide membros para gerirem o orçamento de forma colaborativa.',
    iconBg: "bg-green-500/20 text-green-600",
  },
  {
    icon: <CreditCard className="w-8 h-8 sm:w-12 sm:h-12" />,
    title: "Cartões Inteligentes",
    description:
      "Cadastre seus cartões e adicione suas faturas. O app calculará o total gasto e gerará projeções futuras de compras parceladas.",
    iconBg: "bg-orange-500/20 text-orange-600",
  },
  {
    icon: <Brain className="w-8 h-8 sm:w-12 sm:h-12" />,
    title: "Importação com IA",
    description:
      "Dentro dos detalhes do cartão, use o upload de fatura. Arraste arquivos CSV ou Excel e nossa IA identificará nomes, valores e parcelamentos automaticamente. Se você mudar uma categoria, o sistema aprenderá seu padrão para os próximos envios.",
    iconBg: "bg-blue-500/20 text-blue-600",
  },
];

interface OnboardingDialogProps {
  onComplete?: () => void;
}

export function OnboardingDialog({ onComplete }: OnboardingDialogProps) {
  const [open, setOpen] = useState(false);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem(ONBOARDING_KEY);
    if (!hasSeenOnboarding) {
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!api) return;

    setCurrent(api.selectedScrollSnap());
    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  const handleComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setOpen(false);
    onComplete?.();
  };

  const handlePrevious = () => {
    api?.scrollPrev();
  };

  const handleNext = () => {
    if (current === slides.length - 1) {
      handleComplete();
    } else {
      api?.scrollNext();
    }
  };

  const isLastSlide = current === slides.length - 1;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[95vw] max-w-lg h-auto max-h-[95vh] p-0 gap-0 overflow-hidden flex flex-col border-none sm:border sm:border-border">
        <div className="sr-only">
          <DialogTitle>Bem-vindo ao FinLar</DialogTitle>
          <DialogDescription>Tutorial de introdução ao aplicativo</DialogDescription>
        </div>

        <Carousel setApi={setApi} className="w-full" opts={{ align: "center" }}>
          <CarouselContent>
            {slides.map((slide, index) => (
              <CarouselItem key={index}>
                <div className="flex flex-col items-center text-center p-6 sm:p-10 min-h-[320px] sm:min-h-[400px] justify-center">
                  <div
                    className={`w-16 h-16 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center mb-4 sm:mb-6 transition-all duration-300 ${slide.iconBg}`}
                  >
                    {slide.icon}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-3 leading-tight tracking-tight">
                    {slide.title}
                  </h2>
                  <p className="text-muted-foreground leading-relaxed text-sm sm:text-base max-w-[280px] sm:max-w-sm px-2">
                    {slide.description}
                  </p>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        {/* Dots indicator */}
        <div className="flex justify-center gap-2 pb-6">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => api?.scrollTo(index)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === current ? "bg-primary w-6" : "bg-muted-foreground/30 w-1.5"
              }`}
              aria-label={`Ir para slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between p-4 border-t border-border bg-background/50 backdrop-blur-sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrevious}
            disabled={current === 0}
            className="gap-1 text-xs sm:text-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </Button>

          <Button
            variant={isLastSlide ? "default" : "ghost"}
            size="sm"
            onClick={handleNext}
            className="gap-1 text-xs sm:text-sm"
          >
            {isLastSlide ? (
              "Começar agora"
            ) : (
              <>
                Próximo
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
