export type ServicoStatus = "ativo" | "inativo";

export type Servico = {
  id: string;
  nome: string;
  categoria: string;
  descricaoPt: string;
  descricaoEn: string;
  precoPadrao: number;
  precoVariavel: boolean;
  precoMinimo: number | null;
  precoMaximo: number | null;
  duracaoPadrao: number;
  duracaoMinima: number | null;
  duracaoMaxima: number | null;
  retornoSugeridoDias: number | null;
  status: ServicoStatus;
  observacoesPt: string;
  observacoesEn: string;
};

export const mockServicos: Servico[] = [
  {
    id: "srv-1",
    nome: "Manutenção",
    categoria: "Manutenção",
    descricaoPt: "Reparo e ajuste do trabalho já realizado, mantendo a aparência das unhas.",
    descricaoEn: "Touch-up and repair of existing nail work to keep the look fresh.",
    precoPadrao: 45,
    precoVariavel: true,
    precoMinimo: 40,
    precoMaximo: 55,
    duracaoPadrao: 90,
    duracaoMinima: 75,
    duracaoMaxima: 105,
    retornoSugeridoDias: 21,
    status: "ativo",
    observacoesPt: "Recomendado a cada 3 semanas.",
    observacoesEn: "Recommended every 3 weeks.",
  },
  {
    id: "srv-2",
    nome: "Esmaltação em gel",
    categoria: "Esmaltação",
    descricaoPt: "Aplicação de esmalte em gel com maior durabilidade e brilho.",
    descricaoEn: "Gel polish application with longer-lasting shine.",
    precoPadrao: 40,
    precoVariavel: true,
    precoMinimo: 35,
    precoMaximo: 50,
    duracaoPadrao: 60,
    duracaoMinima: 45,
    duracaoMaxima: 75,
    retornoSugeridoDias: 14,
    status: "ativo",
    observacoesPt: "",
    observacoesEn: "",
  },
  {
    id: "srv-3",
    nome: "Alongamento",
    categoria: "Alongamento",
    descricaoPt: "Alongamento das unhas com técnica em gel ou acrílico.",
    descricaoEn: "Nail extension using gel or acrylic technique.",
    precoPadrao: 110,
    precoVariavel: true,
    precoMinimo: 95,
    precoMaximo: 130,
    duracaoPadrao: 120,
    duracaoMinima: 100,
    duracaoMaxima: 150,
    retornoSugeridoDias: 21,
    status: "ativo",
    observacoesPt: "Pode variar conforme o formato escolhido.",
    observacoesEn: "May vary depending on the chosen shape.",
  },
  {
    id: "srv-4",
    nome: "Remoção",
    categoria: "Remoção",
    descricaoPt: "Remoção segura de esmalte em gel ou alongamento anterior.",
    descricaoEn: "Safe removal of gel polish or previous extensions.",
    precoPadrao: 20,
    precoVariavel: true,
    precoMinimo: 15,
    precoMaximo: 25,
    duracaoPadrao: 30,
    duracaoMinima: 20,
    duracaoMaxima: 40,
    retornoSugeridoDias: null,
    status: "ativo",
    observacoesPt: "",
    observacoesEn: "",
  },
  {
    id: "srv-5",
    nome: "Serviço antigo de teste",
    categoria: "Outros",
    descricaoPt: "Serviço de exemplo usado apenas para testes internos.",
    descricaoEn: "Example service used only for internal testing.",
    precoPadrao: 35,
    precoVariavel: false,
    precoMinimo: null,
    precoMaximo: null,
    duracaoPadrao: 45,
    duracaoMinima: null,
    duracaoMaxima: null,
    retornoSugeridoDias: null,
    status: "inativo",
    observacoesPt: "Não utilizar em atendimentos reais.",
    observacoesEn: "Do not use for real appointments.",
  },
];
