"use client";

import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { SettingsCard } from "@/components/SettingsCard";
import { Toggle } from "@/components/Toggle";
import {
  BuildingIcon,
  ImageIcon,
  GlobeIcon,
  CalendarIcon,
  BellIcon,
  WalletIcon,
  LockIcon,
  DatabaseIcon,
} from "@/components/icons";
import {
  createConfiguracoesIniciais,
  FUSOS_HORARIOS,
  MOEDAS,
  FORMATOS_DATA,
  FORMATOS_HORA,
  DIAS_SEMANA,
  DURACOES_PADRAO,
  FORMAS_PAGAMENTO,
  ULTIMO_BACKUP_FICTICIO,
  type ConfiguracoesState,
  type DiaSemana,
  type SessaoExpiracao,
} from "@/lib/configuracoes-mock";
import type { FormaPagamento } from "@/lib/atendimentos-mock";

const inputClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand/40";

const buttonSecondaryClass =
  "flex w-full items-center justify-center gap-1.5 rounded-xl border border-border px-4 py-3 text-sm font-medium text-foreground/80 transition-transform hover:bg-muted active:scale-[0.98] sm:w-auto";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-foreground/70">{label}</span>
      {children}
    </label>
  );
}

function ColorSwatch({ label, varName }: { label: string; varName: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
      <span
        className="h-6 w-6 shrink-0 rounded-full border border-border"
        style={{ backgroundColor: `var(${varName})` }}
      />
      <div className="min-w-0">
        <p className="truncate text-sm text-foreground/80">{label}</p>
        <p className="truncate font-mono text-[11px] text-foreground/40">var({varName})</p>
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? "border-brand bg-brand/10 text-brand" : "border-border bg-background text-foreground/60 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export default function ConfiguracoesPage() {
  const { locale, toggleLocale, t } = useLanguage();
  const c = t.configuracoes;

  const [state, setState] = useState<ConfiguracoesState>(createConfiguracoesIniciais);
  const [baseline, setBaseline] = useState<ConfiguracoesState>(createConfiguracoesIniciais);
  const [savedMessageVisible, setSavedMessageVisible] = useState(false);

  const dirty = JSON.stringify(state) !== JSON.stringify(baseline);

  function updateSection<S extends keyof ConfiguracoesState>(section: S, patch: Partial<ConfiguracoesState[S]>) {
    setState((prev) => ({ ...prev, [section]: { ...prev[section], ...patch } }));
  }

  function toggleDia(dia: DiaSemana) {
    setState((prev) => {
      const jaAtivo = prev.agenda.diasFuncionamento.includes(dia);
      const diasFuncionamento = jaAtivo
        ? prev.agenda.diasFuncionamento.filter((item) => item !== dia)
        : [...prev.agenda.diasFuncionamento, dia];
      return { ...prev, agenda: { ...prev.agenda, diasFuncionamento } };
    });
  }

  function toggleForma(forma: FormaPagamento) {
    setState((prev) => ({
      ...prev,
      financeiro: {
        ...prev.financeiro,
        formasPagamentoAtivas: {
          ...prev.financeiro.formasPagamentoAtivas,
          [forma]: !prev.financeiro.formasPagamentoAtivas[forma],
        },
      },
    }));
  }

  function handleSalvar() {
    setBaseline(state);
    setSavedMessageVisible(true);
    window.setTimeout(() => setSavedMessageVisible(false), 2500);
  }

  function handleDescartar() {
    setState(baseline);
    setSavedMessageVisible(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">{c.titulo}</h1>
        <p className="text-sm text-foreground/60">{c.subtitulo}</p>
        <p className="mt-2 text-xs text-foreground/50">{t.misc.dadosFicticios}</p>
      </div>

      <SettingsCard icon={BuildingIcon} title={c.negocio.titulo} description={c.negocio.descricao}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label={c.negocio.campos.nome}>
            <input
              type="text"
              value={state.negocio.nome}
              onChange={(event) => updateSection("negocio", { nome: event.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label={c.negocio.campos.nomeCurto}>
            <input
              type="text"
              value={state.negocio.nomeCurto}
              onChange={(event) => updateSection("negocio", { nomeCurto: event.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label={c.negocio.campos.telefone}>
            <input
              type="text"
              value={state.negocio.telefone}
              onChange={(event) => updateSection("negocio", { telefone: event.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label={c.negocio.campos.email}>
            <input
              type="email"
              value={state.negocio.email}
              onChange={(event) => updateSection("negocio", { email: event.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label={c.negocio.campos.endereco}>
            <input
              type="text"
              value={state.negocio.endereco}
              onChange={(event) => updateSection("negocio", { endereco: event.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label={c.negocio.campos.cidade}>
            <input
              type="text"
              value={state.negocio.cidade}
              onChange={(event) => updateSection("negocio", { cidade: event.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label={c.negocio.campos.estado}>
            <input
              type="text"
              value={state.negocio.estado}
              onChange={(event) => updateSection("negocio", { estado: event.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label={c.negocio.campos.zip}>
            <input
              type="text"
              value={state.negocio.zip}
              onChange={(event) => updateSection("negocio", { zip: event.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label={c.negocio.campos.fusoHorario}>
            <select
              value={state.negocio.fusoHorario}
              onChange={(event) => updateSection("negocio", { fusoHorario: event.target.value })}
              className={inputClass}
            >
              {FUSOS_HORARIOS.map((fuso) => (
                <option key={fuso} value={fuso}>
                  {fuso}
                </option>
              ))}
            </select>
          </Field>
          <Field label={c.negocio.campos.moeda}>
            <select
              value={state.negocio.moeda}
              onChange={(event) => updateSection("negocio", { moeda: event.target.value })}
              className={inputClass}
            >
              {MOEDAS.map((moeda) => (
                <option key={moeda} value={moeda}>
                  {moeda}
                </option>
              ))}
            </select>
          </Field>
          <Field label={c.negocio.campos.formatoData}>
            <select
              value={state.negocio.formatoData}
              onChange={(event) => updateSection("negocio", { formatoData: event.target.value })}
              className={inputClass}
            >
              {FORMATOS_DATA.map((formato) => (
                <option key={formato} value={formato}>
                  {formato}
                </option>
              ))}
            </select>
          </Field>
          <Field label={c.negocio.campos.formatoHora}>
            <select
              value={state.negocio.formatoHora}
              onChange={(event) => updateSection("negocio", { formatoHora: event.target.value })}
              className={inputClass}
            >
              {FORMATOS_HORA.map((formato) => (
                <option key={formato} value={formato}>
                  {formato}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </SettingsCard>

      <SettingsCard icon={ImageIcon} title={c.identidadeVisual.titulo} description={c.identidadeVisual.descricao}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-8">
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-dashed border-border bg-muted text-lg font-semibold text-foreground/50">
              {state.negocio.nomeCurto
                .split(" ")
                .map((palavra) => palavra[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <button type="button" className={buttonSecondaryClass}>
              {c.identidadeVisual.alterarLogo}
            </button>
          </div>

          <div className="flex flex-1 flex-col gap-3">
            <p className="text-sm font-medium text-foreground/70">{c.identidadeVisual.visualizacao}</p>
            <div className="flex flex-wrap gap-3">
              <ColorSwatch label={c.identidadeVisual.corPrincipal} varName="--brand" />
              <ColorSwatch label={c.identidadeVisual.corSecundaria} varName="--brand-secondary" />
              <ColorSwatch label={c.identidadeVisual.corDestaque} varName="--brand-accent" />
            </div>
            <button type="button" className={`${buttonSecondaryClass} sm:self-start`}>
              {c.identidadeVisual.restaurarPadrao}
            </button>
          </div>
        </div>
        <p className="text-xs text-foreground/50">{c.identidadeVisual.aviso}</p>
      </SettingsCard>

      <SettingsCard icon={GlobeIcon} title={c.idioma.titulo} description={c.idioma.descricao}>
        <Field label={c.idioma.idiomaApp}>
          <div className="inline-flex w-fit flex-wrap gap-1 rounded-xl border border-border bg-background p-1">
            <button
              type="button"
              onClick={() => locale !== "pt" && toggleLocale()}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                locale === "pt" ? "bg-brand text-white" : "text-foreground/60 hover:text-foreground"
              }`}
            >
              {t.clientes.idiomaLabel.pt}
            </button>
            <button
              type="button"
              onClick={() => locale !== "en" && toggleLocale()}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                locale === "en" ? "bg-brand text-white" : "text-foreground/60 hover:text-foreground"
              }`}
            >
              {t.clientes.idiomaLabel.en}
            </button>
          </div>
        </Field>

        <Field label={c.idioma.idiomaPadraoMensagens}>
          <select
            value={state.idioma.idiomaPadraoMensagens}
            onChange={(event) =>
              updateSection("idioma", { idiomaPadraoMensagens: event.target.value as "pt" | "en" })
            }
            className={inputClass}
          >
            <option value="pt">{t.clientes.idiomaLabel.pt}</option>
            <option value="en">{t.clientes.idiomaLabel.en}</option>
          </select>
        </Field>

        <Toggle
          checked={state.idioma.permitirAlterarPorCliente}
          onChange={(value) => updateSection("idioma", { permitirAlterarPorCliente: value })}
          label={c.idioma.permitirAlterarPorCliente}
          description={c.idioma.permitirAlterarPorClienteDescricao}
        />

        <p className="text-xs text-foreground/50">{c.idioma.aviso}</p>
      </SettingsCard>

      <SettingsCard icon={CalendarIcon} title={c.agenda.titulo} description={c.agenda.descricao}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={c.agenda.horarioAbertura}>
            <input
              type="text"
              value={state.agenda.horarioAbertura}
              onChange={(event) => updateSection("agenda", { horarioAbertura: event.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label={c.agenda.horarioFechamento}>
            <input
              type="text"
              value={state.agenda.horarioFechamento}
              onChange={(event) => updateSection("agenda", { horarioFechamento: event.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label={c.agenda.intervaloPadrao}>
            <input type="text" disabled value={c.agenda.intervaloPadraoValor} className={`${inputClass} opacity-60`} />
          </Field>
          <Field label={c.agenda.duracaoPadrao}>
            <select
              value={state.agenda.duracaoPadraoMinutos}
              onChange={(event) => updateSection("agenda", { duracaoPadraoMinutos: Number(event.target.value) })}
              className={inputClass}
            >
              {DURACOES_PADRAO.map((duracao) => (
                <option key={duracao} value={duracao}>
                  {duracao} {c.agenda.minutos}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-foreground/70">{c.agenda.diasFuncionamento}</p>
          <div className="flex flex-wrap gap-2">
            {DIAS_SEMANA.map((dia) => (
              <Chip key={dia} active={state.agenda.diasFuncionamento.includes(dia)} onClick={() => toggleDia(dia)}>
                {c.agenda.diasSemanaLabel[dia]}
              </Chip>
            ))}
          </div>
        </div>

        <Toggle
          checked={state.agenda.bloqueioConflitoHorario}
          onChange={(value) => updateSection("agenda", { bloqueioConflitoHorario: value })}
          label={c.agenda.bloqueioConflito}
          description={c.agenda.bloqueioConflitoDescricao}
        />
        <Toggle
          checked={state.agenda.permitirEncaixeComConfirmacao}
          onChange={(value) => updateSection("agenda", { permitirEncaixeComConfirmacao: value })}
          label={c.agenda.permitirEncaixe}
          description={c.agenda.permitirEncaixeDescricao}
        />
      </SettingsCard>

      <SettingsCard icon={BellIcon} title={c.lembretes.titulo} description={c.lembretes.descricao}>
        <Toggle
          checked={state.lembretes.ativarLembretesDiaAnterior}
          onChange={(value) => updateSection("lembretes", { ativarLembretesDiaAnterior: value })}
          label={c.lembretes.ativar}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={c.lembretes.horarioPadraoAviso}>
            <input
              type="text"
              value={state.lembretes.horarioPadraoAviso}
              onChange={(event) => updateSection("lembretes", { horarioPadraoAviso: event.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label={c.lembretes.canalPreferido}>
            <select
              value={state.lembretes.canalPreferido}
              onChange={(event) =>
                updateSection("lembretes", { canalPreferido: event.target.value as "whatsapp" | "sms" })
              }
              className={inputClass}
            >
              <option value="whatsapp">{t.clientes.preferenciaLabel.whatsapp}</option>
              <option value="sms">{t.clientes.preferenciaLabel.sms}</option>
            </select>
          </Field>
        </div>

        <Toggle
          checked={state.lembretes.exigirConfirmacaoManual}
          onChange={(value) => updateSection("lembretes", { exigirConfirmacaoManual: value })}
          label={c.lembretes.exigirConfirmacaoManual}
          description={c.lembretes.exigirConfirmacaoManualDescricao}
        />

        <Field label={c.lembretes.textoPadraoPt}>
          <textarea
            rows={3}
            value={state.lembretes.textoPadraoPt}
            onChange={(event) => updateSection("lembretes", { textoPadraoPt: event.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label={c.lembretes.textoPadraoEn}>
          <textarea
            rows={3}
            value={state.lembretes.textoPadraoEn}
            onChange={(event) => updateSection("lembretes", { textoPadraoEn: event.target.value })}
            className={inputClass}
          />
        </Field>
        <p className="font-mono text-xs text-foreground/50">{c.lembretes.variaveisDisponiveis}</p>
      </SettingsCard>

      <SettingsCard icon={WalletIcon} title={c.financeiro.titulo} description={c.financeiro.descricao}>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-foreground/70">{c.financeiro.formasPagamentoAtivas}</p>
          <div className="flex flex-wrap gap-2">
            {FORMAS_PAGAMENTO.map((forma) => (
              <Chip
                key={forma}
                active={state.financeiro.formasPagamentoAtivas[forma]}
                onClick={() => toggleForma(forma)}
              >
                {t.financeiro.formaPagamentoLabel[forma]}
              </Chip>
            ))}
          </div>
        </div>

        <Toggle
          checked={state.financeiro.mostrarGorjetaSeparadamente}
          onChange={(value) => updateSection("financeiro", { mostrarGorjetaSeparadamente: value })}
          label={c.financeiro.mostrarGorjeta}
        />
        <Toggle
          checked={state.financeiro.permitirPagamentoParcial}
          onChange={(value) => updateSection("financeiro", { permitirPagamentoParcial: value })}
          label={c.financeiro.permitirParcial}
        />
        <Toggle
          checked={state.financeiro.mostrarValoresPendentes}
          onChange={(value) => updateSection("financeiro", { mostrarValoresPendentes: value })}
          label={c.financeiro.mostrarPendentes}
        />

        <p className="text-xs text-foreground/50">{c.financeiro.canceladosInfo}</p>
      </SettingsCard>

      <SettingsCard icon={LockIcon} title={c.seguranca.titulo} description={c.seguranca.descricao}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={c.seguranca.emailPrincipal}>
            <input
              type="email"
              value={state.seguranca.emailPrincipal}
              onChange={(event) => updateSection("seguranca", { emailPrincipal: event.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label={c.seguranca.sessaoExpira}>
            <select
              value={state.seguranca.sessaoExpiracaoMinutos}
              onChange={(event) =>
                updateSection("seguranca", { sessaoExpiracaoMinutos: event.target.value as SessaoExpiracao })
              }
              className={inputClass}
            >
              {(["15", "30", "60", "240"] as const).map((valor) => (
                <option key={valor} value={valor}>
                  {c.seguranca.sessaoExpiraLabel[valor]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <button type="button" className={buttonSecondaryClass}>
          {c.seguranca.alterarSenha}
        </button>

        <div className="flex flex-col gap-1 rounded-xl border border-border bg-background p-3">
          <p className="text-sm font-medium text-foreground">{c.seguranca.recuperacaoSenha}</p>
          <p className="text-xs text-foreground/55">{c.seguranca.recuperacaoSenhaDescricao}</p>
        </div>

        <div className="rounded-xl border border-dashed border-border bg-background p-4">
          <p className="text-sm font-medium text-foreground/70">{c.seguranca.usuariosFuturos}</p>
          <p className="mt-1 text-xs text-foreground/50">{c.seguranca.usuariosFuturosDescricao}</p>
          <button type="button" disabled className={`${buttonSecondaryClass} mt-3 cursor-not-allowed opacity-60`}>
            {c.seguranca.convidarUsuario}
          </button>
        </div>
      </SettingsCard>

      <SettingsCard icon={DatabaseIcon} title={c.backup.titulo} description={c.backup.descricao}>
        <p className="text-sm text-foreground/70">
          {c.backup.ultimoBackup}: <span className="font-medium text-foreground">{ULTIMO_BACKUP_FICTICIO[locale]}</span>
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button type="button" className={buttonSecondaryClass}>
            {c.backup.criarBackup}
          </button>
          <button type="button" className={buttonSecondaryClass}>
            {c.backup.exportarDados}
          </button>
        </div>
        <p className="text-xs text-foreground/50">{c.backup.aviso}</p>
      </SettingsCard>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-foreground/60">{dirty ? c.acoes.naoSalvo : c.acoes.salvo}</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={handleDescartar}
            disabled={!dirty}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-border px-5 py-3 text-sm font-medium text-foreground/80 transition-transform hover:bg-muted active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {c.acoes.descartar}
          </button>
          <button
            type="button"
            onClick={handleSalvar}
            disabled={!dirty}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {c.acoes.salvar}
          </button>
        </div>
      </div>

      {savedMessageVisible && (
        <p className="rounded-xl bg-brand/10 px-4 py-2.5 text-sm font-medium text-brand">{c.acoes.confirmacaoSalvar}</p>
      )}
    </div>
  );
}
