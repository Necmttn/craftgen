import { DataTable } from "@/components/data-table";
import { TableControl } from "@seocraft/core/src/controls/table";


export function TableControlComponent<T>(props: { data: TableControl<T> }) {
  return <DataTable data={props.data.data} columns={props.data.columns} />;
}
