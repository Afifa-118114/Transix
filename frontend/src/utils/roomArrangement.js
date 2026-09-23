export const formatRoomArrangement = (arr) => {
  if (!Array.isArray(arr) || arr.length === 0) return "";
  if (arr.length === 1) return `${arr[0]} sharing one room`;
  if (arr.every((n) => n === 1)) return `1 room each (${arr.length} rooms)`;
  return `${arr.join(" + ")} (${arr.length} rooms)`;
};

export const getRoomArrangementOptions = (numTravelers) => {
  const n = Number(numTravelers);
  if (!n || n < 2) return [];

  const partitions = [];

  const partitionHelper = (remaining, maxRoom, current) => {
    if (remaining === 0) {
      partitions.push([...current]);
      return;
    }
    const limit = Math.min(remaining, maxRoom);
    for (let s = limit; s >= 1; s--) {
      current.push(s);
      partitionHelper(remaining - s, s, current);
      current.pop();
    }
  };

  partitionHelper(n, n, []);

  // Filter partitions: room size <= 4 unless single room
  const valid = partitions.filter((p) => {
    if (p.length === 1) return n <= 6;
    return p.every((room) => room <= 4);
  });

  const ranked = valid.map((p) => {
    let score = 0;
    const isAllOnes = p.every((x) => x === 1);
    const isAllTogether = p.length === 1;
    const pairCount = p.filter((x) => x === 2).length;

    score += pairCount * 8;
    const avg = n / p.length;
    const variance = p.reduce((sum, x) => sum + Math.pow(x - avg, 2), 0) / p.length;
    score -= variance * 2;

    if (n === 2) {
      if (p.length === 1) score = 10;
      if (isAllOnes) score = 9;
    } else if (n === 3) {
      if (p.length === 2 && p[0] === 2 && p[1] === 1) score = 15;
      if (isAllTogether) score = 12;
      if (isAllOnes) score = 10;
    } else if (n === 4) {
      if (p.length === 2 && p[0] === 2 && p[1] === 2) score = 20;
      if (p.length === 3 && p[0] === 2 && p[1] === 1 && p[2] === 1) score = 16;
      if (p.length === 2 && p[0] === 3 && p[1] === 1) score = 14;
      if (isAllTogether) score = 12;
      if (isAllOnes) score = 10;
    }

    return { partition: p, score };
  });

  ranked.sort((a, b) => b.score - a.score);

  const top = ranked.slice(0, 5).map((r) => r.partition);

  const allOnes = Array(n).fill(1);
  if (n <= 5 && !top.some((p) => p.length === n && p.every((x) => x === 1))) {
    top.push(allOnes);
  }
  if (n <= 4 && !top.some((p) => p.length === 1 && p[0] === n)) {
    top.push([n]);
  }

  return top.map((p) => {
    let label = p.join(" + ");
    if (p.length === 1) {
      label = `${n} sharing one room`;
    } else if (p.every((x) => x === 1)) {
      label = n <= 3 ? "1 room each" : `1 room each (${n} rooms)`;
    }
    return {
      label,
      value: p,
    };
  });
};

export const parseRoomArrangement = (inputStr, numTravelers) => {
  if (!inputStr || typeof inputStr !== "string") return null;
  const raw = inputStr.trim().toLowerCase();
  const n = Number(numTravelers);
  if (!n || n < 2) return null;

  const options = getRoomArrangementOptions(n);
  const matchedOption = options.find((opt) => opt.label.toLowerCase() === raw);
  if (matchedOption) {
    return matchedOption.value;
  }

  if (raw.includes("each") || raw.includes("separate") || raw.includes("individual")) {
    return Array(n).fill(1);
  }

  if (raw.includes("sharing") || raw.includes("together") || raw.includes("all in") || raw.includes("one room")) {
    return [n];
  }

  const digits = raw.match(/\d+/g);
  if (digits && digits.length > 0) {
    const numbers = digits.map((d) => parseInt(d, 10));
    if (numbers.some((num) => isNaN(num) || num <= 0)) {
      return null;
    }
    const sum = numbers.reduce((acc, curr) => acc + curr, 0);
    if (sum === n) {
      return numbers;
    }
  }

  return null;
};
