import "./App.css";
import { useSSS } from "./main";

function App() {
  const sss = useSSS();

  const [st, setSt] = sss.state.state_3();

  return (
    <>
      <div>{st ?? 0}</div>
      <div>
        <button onClick={() => setSt((st ?? 0) + 1)}>Press</button>
      </div>
    </>
  );
}

export default App;
