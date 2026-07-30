"use client";

import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { Toggle } from "@/components/Toggle";
import { CloseIcon, AlertIcon } from "@/components/icons";
import type { Servico } from "@/lib/servicos-mock";

type ServicoFormModalProps = {
  modo: "criar" | "editar";
  servico: Servico | null;
  onClose: () => void;
  onSave: (servico: Servico) => void;
  erroSalvar?: string | null;
};

const inputClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand/40";

function toNumberOrNull(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function ServicoFormModal({ modo, servico, onClose, onSave, erroSalvar }: ServicoFormModalProps) {
  const { t } = useLanguage();
  const s = t.servicos;
  const f = s.formulario;

  const [nome, setNome] = useState(servico?.nome ?? "");
  const [nomeEn, setNomeEn] = useState(servico?.nomeEn ?? "");
  const [categoria, setCategoria] = useState(servico?.categoria ?? "");
  const [descricaoPt, setDescricaoPt] = useState(servico?.descricaoPt ?? "");
  const [descricaoEn, setDescricaoEn] = useState(servico?.descricaoEn ?? "");
  const [precoPadrao, setPrecoPadrao] = useState(String(servico?.precoPadrao ?? ""));
  const [precoVariavel, setPrecoVariavel] = useState(servico?.precoVariavel ?? false);
  const [precoMinimo, setPrecoMinimo] = useState(servico?.precoMinimo !== null && servico?.precoMinimo !== undefined ? String(servico.precoMinimo) : "");
  const [precoMaximo, setPrecoMaximo] = useState(servico?.precoMaximo !== null && servico?.precoMaximo !== undefined ? String(servico.precoMaximo) : "");
  const [duracaoPadrao, setDuracaoPadrao] = useState(String(servico?.duracaoPadrao ?? ""));
  const [duracaoMinima, setDuracaoMinima] = useState(servico?.duracaoMinima !== null && servico?.duracaoMinima !== undefined ? String(servico.duracaoMinima) : "");
  const [duracaoMaxima, setDuracaoMaxima] = useState(servico?.duracaoMaxima !== null && servico?.duracaoMaxima !== undefined ? String(servico.duracaoMaxima) : "");
  const [retornoSugeridoDias, setRetornoSugeridoDias] = useState(
    servico?.retornoSugeridoDias !== null && servico?.retornoSugeridoDias !== undefined ? String(servico.retornoSugeridoDias) : ""
  );
  const [observacoesPt, setObservacoesPt] = useState(servico?.observacoesPt ?? "");
  const [observacoesEn, setObservacoesEn] = useState(servico?.observacoesEn ?? "");

  const [erro, setErro] = useState<string | null>(null);
  const [confirmandoFechar, setConfirmandoFechar] = useState(false);

  const houveAlteracoes =
    nome !== (servico?.nome ?? "") ||
    nomeEn !== (servico?.nomeEn ?? "") ||
    categoria !== (servico?.categoria ?? "") ||
    descricaoPt !== (servico?.descricaoPt ?? "") ||
    descricaoEn !== (servico?.descricaoEn ?? "") ||
    precoPadrao !== String(servico?.precoPadrao ?? "") ||
    precoVariavel !== (servico?.precoVariavel ?? false) ||
    precoMinimo !== (servico?.precoMinimo !== null && servico?.precoMinimo !== undefined ? String(servico.precoMinimo) : "") ||
    precoMaximo !== (servico?.precoMaximo !== null && servico?.precoMaximo !== undefined ? String(servico.precoMaximo) : "") ||
    duracaoPadrao !== String(servico?.duracaoPadrao ?? "") ||
    duracaoMinima !== (servico?.duracaoMinima !== null && servico?.duracaoMinima !== undefined ? String(servico.duracaoMinima) : "") ||
    duracaoMaxima !== (servico?.duracaoMaxima !== null && servico?.duracaoMaxima !== undefined ? String(servico.duracaoMaxima) : "") ||
    retornoSugeridoDias !==
      (servico?.retornoSugeridoDias !== null && servico?.retornoSugeridoDias !== undefined ? String(servico.retornoSugeridoDias) : "") ||
    observacoesPt !== (servico?.observacoesPt ?? "") ||
    observacoesEn !== (servico?.observacoesEn ?? "");

  function validarESalvar(): boolean {
    if (nome.trim() === "") {
      setErro(f.erros.nomeObrigatorio);
      return false;
    }
    if (categoria.trim() === "") {
      setErro(f.erros.categoriaObrigatoria);
      return false;
    }
    const precoPadraoNum = toNumberOrNull(precoPadrao) ?? 0;
    if (precoPadraoNum < 0) {
      setErro(f.erros.precoInvalido);
      return false;
    }
    const precoMinimoNum = toNumberOrNull(precoMinimo);
    const precoMaximoNum = toNumberOrNull(precoMaximo);
    if (precoVariavel) {
      if (precoMinimoNum === null || precoMaximoNum === null) {
        setErro(f.erros.faixaPrecoObrigatoria);
        return false;
      }
      if (precoMinimoNum > precoMaximoNum) {
        setErro(f.erros.faixaPrecoInvalida);
        return false;
      }
    }
    const duracaoPadraoNum = toNumberOrNull(duracaoPadrao) ?? 0;
    if (duracaoPadraoNum <= 0) {
      setErro(f.erros.duracaoInvalida);
      return false;
    }
    const duracaoMinimaNum = toNumberOrNull(duracaoMinima);
    const duracaoMaximaNum = toNumberOrNull(duracaoMaxima);
    if (duracaoMinimaNum !== null && duracaoMaximaNum !== null && duracaoMinimaNum > duracaoMaximaNum) {
      setErro(f.erros.faixaDuracaoInvalida);
      return false;
    }

    setErro(null);

    const servicoBase: Servico = servico ?? {
      // Identificador definitivo (padrão SRV-000001) é gerado pelo ServicosProvider ao cadastrar.
      id: "",
      nome: "",
      nomeEn: null,
      categoria: "",
      descricaoPt: "",
      descricaoEn: "",
      precoPadrao: 0,
      precoVariavel: false,
      precoMinimo: null,
      precoMaximo: null,
      duracaoPadrao: 0,
      duracaoMinima: null,
      duracaoMaxima: null,
      retornoSugeridoDias: null,
      status: "ativo",
      observacoesPt: "",
      observacoesEn: "",
    };

    onSave({
      ...servicoBase,
      nome: nome.trim(),
      nomeEn: nomeEn.trim() === "" ? null : nomeEn.trim(),
      categoria: categoria.trim(),
      descricaoPt: descricaoPt.trim(),
      descricaoEn: descricaoEn.trim(),
      precoPadrao: precoPadraoNum,
      precoVariavel,
      precoMinimo: precoVariavel ? precoMinimoNum : null,
      precoMaximo: precoVariavel ? precoMaximoNum : null,
      duracaoPadrao: duracaoPadraoNum,
      duracaoMinima: duracaoMinimaNum,
      duracaoMaxima: duracaoMaximaNum,
      retornoSugeridoDias: toNumberOrNull(retornoSugeridoDias),
      observacoesPt: observacoesPt.trim(),
      observacoesEn: observacoesEn.trim(),
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

        <div className="flex flex-col gap-4 overflow-y-auto p-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground/70">{f.nome}</span>
            <input type="text" value={nome} onChange={(event) => setNome(event.target.value)} className={inputClass} />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground/70">{f.nomeEn}</span>
            <input
              type="text"
              value={nomeEn}
              onChange={(event) => setNomeEn(event.target.value)}
              placeholder={f.descricaoPlaceholder}
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground/70">{f.categoria}</span>
            <input
              type="text"
              value={categoria}
              onChange={(event) => setCategoria(event.target.value)}
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground/70">{f.descricaoPt}</span>
            <textarea
              rows={2}
              value={descricaoPt}
              onChange={(event) => setDescricaoPt(event.target.value)}
              placeholder={f.descricaoPlaceholder}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground/70">{f.descricaoEn}</span>
            <textarea
              rows={2}
              value={descricaoEn}
              onChange={(event) => setDescricaoEn(event.target.value)}
              placeholder={f.descricaoPlaceholder}
              className={inputClass}
            />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground/70">{f.precoPadrao}</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={precoPadrao}
                onChange={(event) => setPrecoPadrao(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground/70">{f.duracaoPadrao}</span>
              <input
                type="number"
                min="1"
                step="1"
                value={duracaoPadrao}
                onChange={(event) => setDuracaoPadrao(event.target.value)}
                className={inputClass}
              />
            </label>
          </div>

          <Toggle checked={precoVariavel} onChange={setPrecoVariavel} label={f.precoVariavel} />

          {precoVariavel && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground/70">{f.precoMinimo}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={precoMinimo}
                  onChange={(event) => setPrecoMinimo(event.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground/70">{f.precoMaximo}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={precoMaximo}
                  onChange={(event) => setPrecoMaximo(event.target.value)}
                  className={inputClass}
                />
              </label>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground/70">{f.duracaoMinima}</span>
              <input
                type="number"
                min="0"
                step="1"
                value={duracaoMinima}
                onChange={(event) => setDuracaoMinima(event.target.value)}
                placeholder={f.duracaoPlaceholder}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground/70">{f.duracaoMaxima}</span>
              <input
                type="number"
                min="0"
                step="1"
                value={duracaoMaxima}
                onChange={(event) => setDuracaoMaxima(event.target.value)}
                placeholder={f.duracaoPlaceholder}
                className={inputClass}
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground/70">{f.retornoSugeridoDias}</span>
            <input
              type="number"
              min="0"
              step="1"
              value={retornoSugeridoDias}
              onChange={(event) => setRetornoSugeridoDias(event.target.value)}
              placeholder={f.retornoSugeridoPlaceholder}
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

        {(erro || erroSalvar) && (
          <div className="mx-5 mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
            {erro ?? erroSalvar}
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
