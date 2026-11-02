import App from "@/components/App";
import { monuments, archive } from "@/lib/data";

export default function Page() {
  return <App monuments={monuments} archive={archive} />;
}
