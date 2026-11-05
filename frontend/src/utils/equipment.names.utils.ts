function normalize(text:string): string {
    return text.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

export function startsWithLetter(name:string, letter:string): boolean {
    return normalize(name).startsWith(normalize(letter));
}

export function uniqueNames(items: {name:string}[]): string[] {
    return [...new Set(items.map((e) => e.name.trim()))].sort((a,b) => 
        a.localeCompare(b,"es"),
    );
}

export function downloadTextFile(filename:string, lines:string[]): void {
    const blob = new Blob([lines.join("\n")],{type:"text/plain;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}