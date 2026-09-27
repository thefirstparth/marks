// How every name is matched: lower case, no accents, only letters and digits, single spaces ("Atlético Madrid" →
// "atletico madrid"). Sites reading index.json should fold their names the same way.
export const fold = t => String(t).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
