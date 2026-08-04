"use client";

import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { Toggle } from "@/components/Toggle";
import { CloseIcon, PlusIcon, UserXIcon, AlertIcon } from "@/components/icons";
import type {
  CanalPreferidoContato,
  Cliente,
  Contato,
  IdiomaContato,
  RelacaoContato,
} from "@/lib/clientes-mock";

type ClienteFormModalProps = {
  modo: "criar" | "editar";
  cliente: Cliente | null;
  onClose: () => void;
  onSave: (cliente: Cliente) => void;
  erroSalvar?: string | null;
};

const CONTATO_VAZIO: Contato = {
  nomeContato: "",
  telefone: "",
  relacao: "propria",
  idioma: "pt",
  canalPreferido: "whatsapp",
  receberLembretes: true,
};

const RELACOES: RelacaoContato[] = ["propria", "mae", "pai", "conjuge", "responsavel", "outro"];
const IDIOMAS: IdiomaContato[] = ["pt", "en", "bilingue"];
const CANAIS: CanalPreferidoContato[] = ["whatsapp", "sms", "ambos"];

const inputClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand/40";

function contatoInformado(contato: Contato) {
  return contato.nomeContato.trim() !== "" || contato.telefone.trim() !== "";
}

function telefoneValido(telefone: string) {
  return telefone.replace(/\D/g, "").length >= 7;
}

function contatosIguais(a: Contato, b: Contato) {
  return (
    a.nomeContato === b.nomeContato &&
    a.telefone === b.telefone &&
    a.relacao === b.relacao &&
    a.idioma === b.idioma &&
    a.canalPreferido === b.canalPreferido &&
    a.receberLembretes === b.receberLembretes
  );
}

export function ClienteFormModal({ modo, cliente, onClose, onSave, erroSalvar }: ClienteFormModalProps) {
  const { t } = useLanguage();
  const c = t.clientes;
  const f = c.formulario;

  const [nome, setNome] = useState(cliente?.nome ?? "");
  const [nomePreferencia, setNomePreferencia] = useState(cliente?.nomePreferencia ?? "");
  const [observacoesPt, setObservacoesPt] = useState(cliente?.observacoesPt ?? "");
  const [observacoesEn, setObservacoesEn] = useState(cliente?.observacoesEn ?? "");
  const [contatoPrincipal, setContatoPrincipal] = useState<Contato>(
    cliente?.contatoPrincipal ?? { ...CONTATO_VAZIO }
  );
  const [temContatoSecundario, setTemContatoSecundario] = useState(Boolean(cliente?.contatoSecundario));
  const [contatoSecundario, setContatoSecundario] = useState<Contato>(
    cliente?.contatoSecundario ?? { ...CONTATO_VAZIO }
  );

  const [erroNome, setErroNome] = useState<string | null>(null);
  const [erroTelefonePrincipal, setErroTelefonePrincipal] = useState<string | null>(null);
  const [erroTelefoneSecundario, setErroTelefoneSecundario] = useState<string | null>(null);
  const [confirmandoFechar, setConfirmandoFechar] = useState(false);

  const houveAlteracoes =
    nome !== (cliente?.nome ?? "") ||
    nomePreferencia !== (cliente?.nomePreferencia ?? "") ||
    observacoesPt !== (cliente?.observacoesPt ?? "") ||
    observacoesEn !== (cliente?.observacoesEn ?? "") ||
    !contatosIguais(contatoPrincipal, cliente?.contatoPrincipal ?? CONTATO_VAZIO) ||
    temContatoSecundario !== Boolean(cliente?.contatoSecundario) ||
    (temContatoSecundario && !contatosIguais(contatoSecundario, cliente?.contatoSecundario ?? CONTATO_VAZIO));

  function validarContato(contato: Contato): string | null {
    if (!contatoInformado(contato)) return null;
    if (contato.telefone.trim() === "") return f.erros.telefoneObrigatorio;
    if (!telefoneValido(contato.telefone)) return f.erros.telefoneInvalido;
    return null;
  }

  function validarESalvar(): boolean {
    const nomeOk = nome.trim() !== "";
    setErroNome(nomeOk ? null : f.erros.nomeObrigatorio);

    const erroPrincipal = validarContato(contatoPrincipal);
    setErroTelefonePrincipal(erroPrincipal);

    const erroSecundario = temContatoSecundario ? validarContato(contatoSecundario) : null;
    setErroTelefoneSecundario(erroSecundario);

    if (!nomeOk || erroPrincipal || erroSecundario) return false;

    const contatoPrincipalFinal = contatoInformado(contatoPrincipal) ? contatoPrincipal : null;
    const contatoSecundarioFinal =
      temContatoSecundario && contatoInformado(contatoSecundario) ? contatoSecundario : null;

    const clienteBase: Cliente = cliente ?? {
      // Identificador definitivo (padrão CLI-000001) é gerado pelo ClientesProvider ao cadastrar.
      id: "",
      nome: "",
      nomePreferencia: null,
      contatoPrincipal: null,
      contatoSecundario: null,
      status: "ativa",
      ultimoAtendimento: "",
      proximoAgendamento: null,
      observacoesPt: "",
      observacoesEn: "",
      avisosImportantesPt: [],
      avisosImportantesEn: [],
      valorPendente: 0,
      historico: [],
    };

    onSave({
      ...clienteBase,
      nome: nome.trim(),
      nomePreferencia: nomePreferencia.trim() === "" ? null : nomePreferencia.trim(),
      observacoesPt: observacoesPt.trim(),
      observacoesEn: observacoesEn.trim(),
      contatoPrincipal: contatoPrincipalFinal,
      contatoSecundario: contatoSecundarioFinal,
    });

    return true;
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    validarESalvar();
  }

  function tentarFechar() {
    if (houveAlteracoes) {
      setConfirmandoFechar(true);
      return;
    }
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center"
      onClick={tentarFechar}
    >
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-2xl bg-surface shadow-lg sm:mx-4 sm:max-w-xl sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border bg-surface p-5">
          <h3 className="truncate text-lg font-semibold text-foreground">
            {modo === "criar" ? f.tituloCriar : f.tituloEditar}
          </h3>
          <button
            type="button"
            onClick={tentarFechar}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
          >
            <CloseIcon className="h-3.5 w-3.5" />
            {f.fechar}
          </button>
        </div>

        <div className="flex flex-col gap-6 overflow-y-auto p-5">
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-foreground">{f.secaoDadosCliente}</p>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground/70">{f.nomeCompleto}</span>
              <input
                type="text"
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                className={inputClass}
              />
              {erroNome && <span className="text-xs font-medium text-red-600 dark:text-red-400">{erroNome}</span>}
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground/70">{f.nomePreferencia}</span>
              <input
                type="text"
                value={nomePreferencia}
                onChange={(event) => setNomePreferencia(event.target.value)}
                placeholder={f.nomePreferenciaPlaceholder}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground/70">{f.observacoesPt}</span>
              <textarea
                rows={2}
                value={observacoesPt}
                onChange={(event) => setObservacoesPt(event.target.value)}
                placeholder={f.observacoesPlaceholder}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground/70">{f.observacoesEn}</span>
              <textarea
                rows={2}
                value={observacoesEn}
                onChange={(event) => setObservacoesEn(event.target.value)}
                placeholder={f.observacoesPlaceholder}
                className={inputClass}
              />
            </label>
          </div>

          <ContatoFieldset
            titulo={f.secaoContatoPrincipal}
            contato={contatoPrincipal}
            onChange={setContatoPrincipal}
            erroTelefone={erroTelefonePrincipal}
            c={c}
          />

          {temContatoSecundario ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">{f.secaoContatoSecundario}</p>
                <button
                  type="button"
                  onClick={() => {
                    setTemContatoSecundario(false);
                    setContatoSecundario({ ...CONTATO_VAZIO });
                    setErroTelefoneSecundario(null);
                  }}
                  className="flex items-center gap-1.5 rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-950/30"
                >
                  <UserXIcon className="h-3.5 w-3.5" />
                  {f.removerContatoSecundario}
                </button>
              </div>
              <ContatoFieldset
                titulo={null}
                contato={contatoSecundario}
                onChange={setContatoSecundario}
                erroTelefone={erroTelefoneSecundario}
                c={c}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setTemContatoSecundario(true)}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border px-3 py-3 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
            >
              <PlusIcon className="h-4 w-4" />
              {f.adicionarContatoSecundario}
            </button>
          )}
        </div>

        {erroSalvar && (
          <div className="mx-5 mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
            {erroSalvar}
          </div>
        )}

        <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t border-border bg-surface p-5">
          <button
            type="button"
            onClick={tentarFechar}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground/80 transition-transform hover:bg-muted active:scale-[0.98]"
          >
            {f.botoes.cancelar}
          </button>
          <button
            type="submit"
            className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
          >
            {f.botoes.salvar}
          </button>
        </div>
      </form>

      {confirmandoFechar && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl bg-surface p-5 shadow-lg">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-status-aguardando/10 text-status-aguardando">
                <AlertIcon className="h-5 w-5" />
              </span>
              <p className="pt-1.5 text-sm font-semibold text-foreground">{f.alteracoesNaoSalvas.titulo}</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setConfirmandoFechar(false)}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground/80 transition-transform hover:bg-muted active:scale-[0.98]"
              >
                {f.alteracoesNaoSalvas.cancelar}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmandoFechar(false);
                  onClose();
                }}
                className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition-transform hover:bg-red-50 active:scale-[0.98] dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                {f.alteracoesNaoSalvas.descartar}
              </button>
              <button
                type="button"
                onClick={() => {
                  const salvou = validarESalvar();
                  if (salvou) setConfirmandoFechar(false);
                }}
                className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
              >
                {f.alteracoesNaoSalvas.salvar}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type ContatoFieldsetProps = {
  titulo: string | null;
  contato: Contato;
  onChange: (contato: Contato) => void;
  erroTelefone: string | null;
  c: ReturnType<typeof useLanguage>["t"]["clientes"];
};

function ContatoFieldset({ titulo, contato, onChange, erroTelefone, c }: ContatoFieldsetProps) {
  function patch(valores: Partial<Contato>) {
    onChange({ ...contato, ...valores });
  }

  return (
    <div className="flex flex-col gap-3">
      {titulo && <p className="text-sm font-semibold text-foreground">{titulo}</p>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground/70">{c.campos.nomeContato}</span>
          <input
            type="text"
            value={contato.nomeContato}
            onChange={(event) => patch({ nomeContato: event.target.value })}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground/70">{c.campos.telefone}</span>
          <input
            type="tel"
            value={contato.telefone}
            onChange={(event) => patch({ telefone: event.target.value })}
            className={inputClass}
          />
          {erroTelefone && (
            <span className="text-xs font-medium text-red-600 dark:text-red-400">{erroTelefone}</span>
          )}
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground/70">{c.campos.relacao}</span>
          <select
            value={contato.relacao}
            onChange={(event) => patch({ relacao: event.target.value as RelacaoContato })}
            className={inputClass}
          >
            {RELACOES.map((relacao) => (
              <option key={relacao} value={relacao}>
                {c.relacaoLabel[relacao]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground/70">{c.campos.idioma}</span>
          <select
            value={contato.idioma}
            onChange={(event) => patch({ idioma: event.target.value as IdiomaContato })}
            className={inputClass}
          >
            {IDIOMAS.map((idioma) => (
              <option key={idioma} value={idioma}>
                {c.idiomaLabel[idioma]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground/70">{c.campos.canalPreferido}</span>
          <select
            value={contato.canalPreferido}
            onChange={(event) => patch({ canalPreferido: event.target.value as CanalPreferidoContato })}
            className={inputClass}
          >
            {CANAIS.map((canal) => (
              <option key={canal} value={canal}>
                {c.canalLabel[canal]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <Toggle
        checked={contato.receberLembretes}
        onChange={(value) => patch({ receberLembretes: value })}
        label={c.campos.receberLembretes}
      />
    </div>
  );
}
