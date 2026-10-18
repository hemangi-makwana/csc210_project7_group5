/**
 * ============================================================================
 * UNIT TESTS: GRAPH MODULE
 * ============================================================================
 *
 * Verifies that the custom Graph class works accurately:
 * 1. Adding vertices and edges.
 * 2. Retrieving neighbors and edge weights.
 * 3. Breadth-First Search (BFS) finding shortest paths and degrees of separation.
 * 4. Depth-First Search (DFS) exploring connected components and clusters.
 * 5. Finding mutual connections.
 * 6. Edge weight updates (e.g. for session ratings).
 */

const Graph = require("./graph");

describe("Graph Data Structure Tests", () => {
  let graph;

  beforeEach(() => {
    graph = new Graph();
  });

  test("should add vertices and check existence", () => {
    expect(graph.hasVertex("user_1")).toBe(false);
    graph.addVertex("user_1", { name: "Alice", role: "mentor" });
    expect(graph.hasVertex("user_1")).toBe(true);
    expect(graph.getStats().vertexCount).toBe(1);
  });

  test("should add undirected edges between vertices and retrieve neighbors", () => {
    graph.addEdge("user_1", "user_2", 4.8, "mentorship", true);

    expect(graph.hasEdge("user_1", "user_2")).toBe(true);
    expect(graph.hasEdge("user_2", "user_1")).toBe(true);
    expect(graph.getEdgeWeight("user_1", "user_2")).toBe(4.8);

    const neighbors1 = graph.getNeighbors("user_1");
    expect(neighbors1.length).toBe(1);
    expect(neighbors1[0].target).toBe("user_2");
  });

  test("should update edge weights correctly", () => {
    graph.addEdge("user_1", "user_2", 3.5);
    expect(graph.getEdgeWeight("user_1", "user_2")).toBe(3.5);

    graph.updateEdgeWeight("user_1", "user_2", 5.0);
    expect(graph.getEdgeWeight("user_1", "user_2")).toBe(5.0);
    expect(graph.getEdgeWeight("user_2", "user_1")).toBe(5.0);
  });

  test("BFS should calculate degrees of separation and shortest path accurately", () => {
    // Construct network: A - B - C - D, and A - E
    graph.addEdge("A", "B");
    graph.addEdge("B", "C");
    graph.addEdge("C", "D");
    graph.addEdge("A", "E");

    // Same node
    expect(graph.getDegreesOfSeparation("A", "A")).toBe(0);

    // Direct neighbor (1 hop)
    expect(graph.getDegreesOfSeparation("A", "B")).toBe(1);
    expect(graph.getDegreesOfSeparation("A", "E")).toBe(1);

    // Mutual connection (2 hops)
    expect(graph.getDegreesOfSeparation("A", "C")).toBe(2);

    // 3 hops
    expect(graph.getDegreesOfSeparation("A", "D")).toBe(3);

    // Disconnected node
    graph.addVertex("Z");
    expect(graph.getDegreesOfSeparation("A", "Z")).toBe(Infinity);

    // Shortest path test
    const { shortestPath } = graph.bfs("A", "D");
    expect(shortestPath).toEqual(["A", "B", "C", "D"]);
  });

  test("DFS should discover all nodes in a connected community cluster", () => {
    // Cluster 1: X - Y - Z
    graph.addEdge("X", "Y");
    graph.addEdge("Y", "Z");

    // Cluster 2: M - N
    graph.addEdge("M", "N");

    const clusterX = graph.dfs("X");
    expect(clusterX.sort()).toEqual(["X", "Y", "Z"]);

    const clusterM = graph.dfs("M");
    expect(clusterM.sort()).toEqual(["M", "N"]);

    const components = graph.findConnectedComponents();
    expect(components.length).toBe(2);
  });

  test("should find mutual connections between two users", () => {
    // Alice and Charlie both know Bob and Dave
    graph.addEdge("Alice", "Bob");
    graph.addEdge("Alice", "Dave");
    graph.addEdge("Charlie", "Bob");
    graph.addEdge("Charlie", "Dave");
    graph.addEdge("Alice", "Eve"); // Charlie doesn't know Eve

    const mutual = graph.findMutualConnections("Alice", "Charlie");
    expect(mutual.sort()).toEqual(["Bob", "Dave"]);
  });

  test("should return accurate graph statistics", () => {
    graph.addEdge("A", "B");
    graph.addEdge("B", "C");
    graph.addEdge("A", "C");

    const stats = graph.getStats();
    expect(stats.vertexCount).toBe(3);
    expect(stats.edgeCount).toBe(3);
    expect(stats.density).toBe(1.0); // Complete triangle graph
  });
});
