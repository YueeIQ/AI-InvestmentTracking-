
import { AssetType, Holding } from '../types';

// Helper to load a script for JSONP
const loadScript = (url: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.onload = () => {
      document.body.removeChild(script);
      resolve();
    };
    script.onerror = () => {
      document.body.removeChild(script);
      reject(new Error(`Failed to load script: ${url}`));
    };
    document.body.appendChild(script);
  });
};

// --- Fund Fetching (TianTian Fund) ---
// Returns: { fundcode, name, jzrq, dwjz (prev close), gsz (current est), gszzl, gztime }
interface FundData {
  fundcode: string;
  name: string;
  dwjz: string; // Net Value (usually yesterday's close)
  jzrq: string; // Net Value Date
  gsz: string;  // Real-time Estimate
  gszzl: string;
  gztime: string; // Estimate Time
}

const fetchFundData = async (code: string): Promise<Partial<Holding> | null> => {
  return new Promise((resolve) => {
    // Unique callback name is not supported by this specific API, it always calls jsonpgz
    const originalCallback = (window as any).jsonpgz;
    
    (window as any).jsonpgz = (data: FundData) => {
      if (data.fundcode === code) {
        // Prioritize Real-time Estimate (gsz) if available and not empty, else use Net Value (dwjz)
        const est = parseFloat(data.gsz);
        const nav = parseFloat(data.dwjz);
        
        // Logic: Use Estimate if valid, otherwise NAV
        const isEstimateValid = !isNaN(est) && est > 0;
        const currentPrice = isEstimateValid ? est : nav;
        const yesterdayPrice = nav;
        const priceDate = isEstimateValid ? data.gztime : data.jzrq;
        
        resolve({
          name: data.name,
          currentPrice: isNaN(currentPrice) ? 0 : currentPrice,
          yesterdayPrice: isNaN(yesterdayPrice) ? 0 : yesterdayPrice,
          priceDate: priceDate
        });
      } else if (originalCallback) {
        originalCallback(data);
      }
    };

    const url = `https://fundgz.1234567.com.cn/js/${code}.js?rt=${Date.now()}`;
    loadScript(url).catch(() => {
        // Fallback or error
        console.warn(`Failed to fetch fund data for ${code}`);
        resolve(null); 
    });
  });
};

// --- Stock Fetching (Sina Finance) ---
// var hq_str_sh601006="Name, Open, Prev Close, Current, High, Low, ...";
// Index 0: Name, 1: Open, 2: Prev Close, 3: Current Price
// Index 30: Date (yyyy-MM-dd), 31: Time (HH:mm:ss)
const fetchStockData = async (code: string): Promise<Partial<Holding> | null> => {
  // Simple heuristic for market prefix
  let prefix = 'sh';
  if (code.startsWith('6')) prefix = 'sh';
  else if (code.startsWith('0') || code.startsWith('3')) prefix = 'sz';
  else if (code.startsWith('8') || code.startsWith('4')) prefix = 'bj';

  const varName = `hq_str_${prefix}${code}`;
  const url = `https://hq.sinajs.cn/list=${prefix}${code}`;

  try {
    await loadScript(url);
    const dataStr = (window as any)[varName] as string;
    if (dataStr) {
      const parts = dataStr.split(',');
      if (parts.length > 31) {
        const name = parts[0];
        const prevClose = parseFloat(parts[2]);
        const current = parseFloat(parts[3]);
        const date = parts[30];
        const time = parts[31];
        
        // For stocks, current price is strictly Index 3. 
        // If market is closed, Index 3 is the close price of the last session.
        const validCurrent = current > 0 ? current : prevClose;

        return {
          name: name,
          currentPrice: validCurrent,
          yesterdayPrice: prevClose,
          priceDate: `${date} ${time}`
        };
      }
    }
  } catch (e) {
    console.error(`Failed to fetch stock ${code}`, e);
  }
  return null;
};

export const refreshMarketPrices = async (holdings: Holding[]): Promise<Holding[]> => {
  const updatedHoldings = [...holdings];

  // Process sequentially to avoid JSONP collision on the fund API which uses a fixed callback name
  for (let i = 0; i < updatedHoldings.length; i++) {
    const h = updatedHoldings[i];
    try {
      let data: Partial<Holding> | null = null;
      if (h.type === AssetType.FUND) {
        data = await fetchFundData(h.code);
      } else {
        data = await fetchStockData(h.code);
      }

      if (data) {
        updatedHoldings[i] = {
          ...h,
          name: data.name || h.name, // Update name if fetched
          currentPrice: data.currentPrice || h.currentPrice,
          yesterdayPrice: data.yesterdayPrice || h.currentPrice, // Fallback to current if no prev
          priceDate: data.priceDate || h.priceDate
        };
      }
    } catch (e) {
      console.warn(`Error updating ${h.code}`, e);
    }
  }

  return updatedHoldings;
};
