import { useState, useEffect, useRef } from "react";

/**
 * Debounced Indian pincode lookup via api.postalpincode.in.
 * Returns { pincode, setPincode, status, result, errorMsg }
 * status: "idle" | "loading" | "success" | "error"
 * result: { name, district, state, postOffices }
 */
export function usePincodeLookup() {
  const [pincode, setPincode] = useState("");
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const timerRef = useRef(null);

  useEffect(() => {
    if (pincode.length !== 6) {
      setStatus("idle");
      setResult(null);
      setErrorMsg("");
      return;
    }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setStatus("loading");
      setResult(null);
      setErrorMsg("");
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
        const data = await res.json();
        const entry = data?.[0];
        if (!entry || entry.Status !== "Success" || !entry.PostOffice?.length) {
          setStatus("error");
          setErrorMsg("Invalid pincode or no data found. Please check and try again.");
          return;
        }
        const pos = entry.PostOffice;
        const headPO = pos.find(p => p.BranchType === "Head Post Office") || pos[0];
        setResult({
          name: headPO.Name,
          district: headPO.District,
          state: headPO.State,
          block: headPO.Block && headPO.Block !== "NA" ? headPO.Block : "",
          postOffices: pos.map(p => p.Name),
        });
        setStatus("success");
      } catch {
        setStatus("error");
        setErrorMsg("Could not fetch pincode details. Check your connection and try again.");
      }
    }, 600);
    return () => clearTimeout(timerRef.current);
  }, [pincode]);

  const reset = () => {
    setPincode("");
    setStatus("idle");
    setResult(null);
    setErrorMsg("");
  };

  return { pincode, setPincode, status, result, errorMsg, reset };
}
