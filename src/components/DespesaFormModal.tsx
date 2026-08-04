"use client";

import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { CloseIcon } from "@/components/icons";
import { CATEGORIAS_DESPESA, type CategoriaDespesa, type TipoDespesa } from "@/lib/despesas-mock";
import { criarDespesaAvulsaAction, criarDespesaParceladaAction, criarDespesaRecorrenteAction } from "@/lib/despesas-actions";
import { formatDateISO } from "@/lib/date";

const inputClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand/40";

const DIAS_SEMANA = [0, 1, 2, 3, 4, 5, 6] as const;

type DespesaFormModalProps = {
  onClose: () => void;
  onSalvo: () => void;
};

export function DespesaFormModal({ onClose, onSalvo }: DespesaFormModalProps) {
  const { t } = useLanguage();
  const d = t.despesas;

  const [tipo, setTipo] = useState<TipoDespesa>("avulsa");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState<CategoriaDespesa>("outros");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(() => formatDateISO(new Date()));
  const [parcelas, setParcelas] = useState("2");
  const [diaSemana, setDiaSemana] = useState<number>(new Date().getDay());
  const [dataEncerramento, setDataEncerramento] = useState("");
  const [observacoesPt, setObservacoesPt] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErro(null);
    setSalvando(true);
    try {
      const valorNum = Number(valor);
      if (tipo === "avulsa") {
        await criarDespesaAvulsaAction({ descricao, categoria, valorTotal: valorNum, data, observacoesPt });
      } else if (tipo === "parcelada") {
        await criarDespesaParceladaAction({
          descricao,
          categoria,
          valorTotal: valorNum,
          parcelas: Number(parcelas),
          data,
          observacoesPt,
        });
      } else {
        await criarDespesaRecorrenteAction({
          descricao,
          categoria,
          valorSemanal: valorNum,
          diaSemana,
          dataInicio: data,
          dataEncerramento: dataEncerramento || null,
          observacoesPt,
        });
      }
      onSalvo();
    } catch (error) {
      setErro(error instanceof Error ? error.message : d.form.erroGenerico);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-2xl bg-surface shadow-lg sm:mx-4 sm:max-w-md sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border bg-surface p-5">
          <h3 className="text-lg font-semibold text-foreground">{d.form.titulo}</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
          >
            <CloseIcon className="h-3.5 w-3.5" />
            {d.form.fechar}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto p-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground/70">{d.form.tipo}</span>
            <select value={tipo} onChange={(event) => setTipo(event.target.value as TipoDespesa)} className={inputClass}>
              <option value="avulsa">{d.tipoLabel.avulsa}</option>
              <option value="parcelada">{d.tipoLabel.parcelada}</option>
              <option value="recorrente">{d.tipoLabel.recorrente}</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground/70">{d.form.descricao}</span>
            <input value={descricao} onChange={(event) => setDescricao(event.target.value)} className={inputClass} required />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground/70">{d.form.categoria}</span>
            <select value={categoria} onChange={(event) => setCategoria(event.target.value as CategoriaDespesa)} className={inputClass}>
              {CATEGORIAS_DESPESA.map((cat) => (
                <option key={cat} value={cat}>
                  {d.categoriaLabel[cat]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground/70">{tipo === "recorrente" ? d.form.valorSemanal : d.form.valorTotal}</span>
            <input type="number" min="0.01" step="0.01" value={valor} onChange={(event) => setValor(event.target.value)} className={inputClass} required />
          </label>

          {tipo === "parcelada" && (
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground/70">{d.form.parcelas}</span>
              <input type="number" min="1" max="60" step="1" value={parcelas} onChange={(event) => setParcelas(event.target.value)} className={inputClass} required />
            </label>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground/70">{tipo === "recorrente" ? d.form.dataInicio : d.form.data}</span>
            <input type="date" value={data} onChange={(event) => setData(event.target.value)} className={inputClass} required />
          </label>

          {tipo === "recorrente" && (
            <>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground/70">{d.form.diaSemana}</span>
                <select value={diaSemana} onChange={(event) => setDiaSemana(Number(event.target.value))} className={inputClass}>
                  {DIAS_SEMANA.map((dia) => (
                    <option key={dia} value={dia}>
                      {d.diaSemanaLabel[dia]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground/70">{d.form.dataEncerramento}</span>
                <input type="date" value={dataEncerramento} min={data} onChange={(event) => setDataEncerramento(event.target.value)} className={inputClass} />
              </label>
            </>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground/70">{d.form.observacoes}</span>
            <textarea value={observacoesPt} onChange={(event) => setObservacoesPt(event.target.value)} rows={2} className={inputClass} />
          </label>

          {erro && (
            <p className="rounded-xl bg-status-cancelado/10 px-3 py-2 text-xs font-medium text-status-cancelado">{erro}</p>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground/80 transition-transform hover:bg-muted active:scale-[0.98]"
            >
              {d.form.cancelar}
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {salvando ? d.form.salvando : d.form.salvar}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
