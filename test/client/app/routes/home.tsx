import type { Route } from "./+types/home";
import { useSSS } from "~/context/createSSSContext";

export function meta({}: Route.MetaArgs) {
  return [{ title: "New React Router App" }, { name: "description", content: "Welcome to React Router!" }];
}

export default function Home() {
  const sss = useSSS();
  const [num, setNum] = sss.myNumStateX(100);
  return (
    <div>
      <div>{num}</div>
      <div>
        <button onClick={() => setNum(num + 1)}>Increment</button>
      </div>
    </div>
  );
}
