export type Connection = {
    character: string;
    interactions: number;
};

export type GraphData = {
    nodes: { id: string; name: string; value: number }[];
    links: { source: string; target: string; value: number }[];
};

/**
 * Get all connections for a character from the interaction data
 * @param characterName The name of the character to get connections for
 * @param characterData The interaction data from the API
 * @returns An array of connections sorted by interaction count (descending)
 */
export function getCharacterConnections(
    characterName: string,
    characterData: Record<string, Record<string, { interactions: number; }>> | null
): Connection[] {
    if (!characterData) return [];

    const connections: Connection[] = [];

    // If this character has interactions as a source
    if (characterData[characterName]) {
        Object.entries(characterData[characterName]).forEach(([targetName, data]) => {
            connections.push({
                character: targetName,
                interactions: data.interactions
            });
        });
    }

    // Check for interactions where this character is a target
    Object.entries(characterData).forEach(([sourceName, targets]) => {
        if (sourceName !== characterName && targets[characterName]) {
            // Check if this connection is already added (to avoid duplicates)
            const existingConnection = connections.find(c => c.character === sourceName);
            if (!existingConnection) {
                connections.push({
                    character: sourceName,
                    interactions: targets[characterName].interactions
                });
            }
        }
    });

    // Sort by interaction count (descending)
    return connections.sort((a, b) => b.interactions - a.interactions);
}

/**
 * Transform character interaction data into network graph format
 * @param data The character interaction data from the API
 * @returns Formatted data for the network graph component
 */
export function transformCharacterData(data: Record<string, Record<string, { interactions: number }>> | null): GraphData {
    if (!data) return { nodes: [], links: [] };

    const nodes: { id: string; name: string; value: number }[] = [];
    const links: { source: string; target: string; value: number }[] = [];
    const nodeMap = new Map<string, number>();

    // First pass: collect all unique characters and their total interactions
    Object.entries(data).forEach(([character, interactions]) => {
        let totalInteractions = 0;
        Object.values(interactions).forEach(({ interactions: count }) => {
            totalInteractions += count;
        });
        nodeMap.set(character, totalInteractions);
    });

    // Create nodes with values based on total interactions
    nodeMap.forEach((value, name) => {
        nodes.push({
            id: name,
            name,
            value
        });
    });

    // Create links between characters
    Object.entries(data).forEach(([source, interactions]) => {
        Object.entries(interactions).forEach(([target, { interactions: value }]) => {
            // Only create links between nodes that exist
            if (nodeMap.has(source) && nodeMap.has(target)) {
                links.push({
                    source,
                    target,
                    value
                });
            }
        });
    });

    return { nodes, links };
}
