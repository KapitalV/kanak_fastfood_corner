"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardBody, EmptyState } from "@/components/ui/index";
import { supabase } from "@/lib/supabase";

type Config = { table: string; title: string; columns: string[]; filter?: { key: string; value: unknown } };

export function AdminDataPage({ config }: { config: Config }) {
  const query = useQuery({ queryKey: ["admin-table", config.table, config.filter], queryFn: async () => { let request = supabase.from(config.table).select("*").order("created_at", { ascending: false }).limit(100); if (config.filter) request = request.eq(config.filter.key, config.filter.value as string); const { data, error } = await request; if (error) throw error; return data as Record<string, unknown>[]; } });
  return <Card><CardBody className="p-0">{query.data?.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500"><tr>{config.columns.map((column) => <th key={column} className="px-5 py-3">{column.replaceAll("_", " ")}</th>)}</tr></thead><tbody className="divide-y divide-stone-100">{query.data.map((row, index) => <tr key={String(row.id ?? index)}>{config.columns.map((column) => <td key={column} className="max-w-64 truncate px-5 py-4 text-stone-700">{typeof row[column] === "boolean" ? (row[column] ? "Yes" : "No") : String(row[column] ?? "—")}</td>)}</tr>)}</tbody></table></div> : <EmptyState title={query.isLoading ? "Loading…" : `No ${config.title.toLowerCase()} yet`} body={query.error instanceof Error ? query.error.message : undefined} />}</CardBody></Card>;
}
