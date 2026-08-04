# Projeto técnico — Despesas (implementado)

**Implementado em 2026-08-04**, após confirmação de todas as decisões de negócio abaixo. Ver `CERTIFICATION.md` para o resumo do que foi entregue e `PROJECT_STATUS.md` §16 para o detalhamento técnico. Este documento é mantido como registro do desenho original e das decisões aprovadas.

## Objetivo

Registrar gastos do salão sem controle de estoque: aluguel semanal, compras avulsas e equipamentos parcelados. O financeiro poderá apresentar receitas, despesas e saldo do período. Esse saldo é um resultado operacional simples, não uma apuração contábil ou fiscal de lucro.

## Estrutura proposta

Uma **Despesa** terá descrição, categoria, valor total, data, tipo (avulsa, recorrente ou parcelada), frequência ou quantidade de parcelas, observação e status. Cada **Lançamento de despesa** terá competência, vencimento, número da parcela, valor, status, data e forma de pagamento opcional.

O histórico deve ser preservado: correções ocorrerão por cancelamento ou ajuste rastreável, nunca por exclusão silenciosa de valores já considerados.

## Comportamento esperado

- Compra avulsa: um lançamento.
- Compra parcelada: lançamentos mensais cuja soma seja exatamente o total, inclusive com centavos.
- Despesa semanal: previsões semanais até ser encerrada.
- Sem quantidade de produtos, movimentação de itens ou qualquer recurso de estoque.
- Resumo separado em receita, despesa e saldo, com filtros por período, categoria, status e tipo.
- Exportação futura em CSV e JSON.

## Decisões que exigem confirmação

1. O saldo usará somente valores pagos ou também previstos?
2. Qual dia representa o aluguel semanal e como tratar semanas parciais?
3. A primeira parcela ocorre na compra ou no mês seguinte?
4. Será permitido pagamento parcial?
5. Quais serão as categorias iniciais?
6. Como tratar mudança de valor em uma recorrência?
7. A gorjeta continuará fora do resultado do negócio?

## Implantação futura segura

- Criar novas tabelas sem modificar pagamentos e atendimentos existentes.
- Não preencher despesas retroativas automaticamente.
- Fazer backup e testar primeiro em banco descartável.
- Cobrir avulsa, semanal, parcelamento, arredondamento, cancelamento, filtros e exportação.
- Publicar primeiro em ambiente de teste e validar no iPad.

## Critérios mínimos de aceite

- US$ 1.200 em 10 parcelas produz 10 lançamentos de US$ 120.
- Valores com centavos preservam exatamente o total.
- Cancelar previsão futura não altera receitas nem pagamentos anteriores.
- Despesas não alteram clientes, serviços, agenda ou atendimentos.
- O resumo explica visualmente cada componente do saldo.
- A experiência funciona no iPad vertical e horizontal.
