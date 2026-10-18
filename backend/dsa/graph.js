/**
 * ============================================================================
 * DATA STRUCTURE: GRAPH (ADJACENCY LIST WITH BFS & DFS TRAVERSAL)
 * ============================================================================
 *
 * What is a Graph?
 * A Graph is a non-linear network data structure consisting of:
 * 1. Vertices (Nodes): Represent entities (such as users, mentors, learners, or skills).
 * 2. Edges (Links): Represent relationships connecting pairs of vertices
 *    (such as "User A mentored User B", "User A teaches Python", or "User A learned from User B").
 *
 * Real-World Analogy (Viva Defense Point):
 * Think of LinkedIn or a social network:
 * - Each person is a vertex (node).
 * - A connection between two people is an edge.
 * - "1st degree connection" = direct edge (1 hop).
 * - "2nd degree connection" = friend of a friend (2 hops via a shared mutual contact).
 *
 * Why use a Graph in SkillSwap?
 * Rather than isolated database rows, learning is inherently networked:
 * - Learners are connected to mentors through past sessions and mutual skills.
 * - A Graph models social and pedagogical proximity: learners are much more likely
 *   to trust and succeed with a mentor who has taught their peers or shares mutual
 *   learning circles.
 *
 * Representation: Adjacency List
 * We use an Adjacency List (implemented with JavaScript Maps and Sets/Arrays)
 * where each vertex maps to a list of its outgoing/incoming edges.
 *
 * Time Complexity (Viva Defense Point):
 * - Adding a Vertex: O(1)
 * - Adding an Edge: O(1)
 * - Breadth-First Search (BFS): O(V + E) [Shortest path & degrees of separation]
 * - Depth-First Search (DFS): O(V + E) [Community & cluster discovery]
 * - Degree of Separation Lookup: O(V + E)
 *
 * Space Complexity:
 * - O(V + E) where V = number of vertices and E = number of edges.
 *   This is far more memory-efficient than an Adjacency Matrix (which takes O(V^2)),
 *   especially for sparse peer networks.
 * ============================================================================
 */

class Graph {
  /**
   * Initializes an empty Adjacency List Graph.
   */
  constructor() {
    // Map of vertexId -> vertexMetadata
    this.vertices = new Map();
    // Map of vertexId -> Map of (neighborVertexId -> edgeDetails)
    this.adjacencyList = new Map();
  }

  /**
   * Adds a vertex to the graph if it does not already exist.
   *
   * @param {string} vertexId - Unique identifier for the vertex (e.g. userId or skillId)
   * @param {object} [metadata={}] - Optional metadata (e.g. name, role, skills)
   * @returns {boolean} True if added, false if it already existed
   */
  addVertex(vertexId, metadata = {}) {
    if (!vertexId) return false;
    const key = String(vertexId);

    if (!this.vertices.has(key)) {
      this.vertices.set(key, { id: key, ...metadata });
      this.adjacencyList.set(key, new Map());
      return true;
    }

    // Update existing vertex metadata if provided
    const existing = this.vertices.get(key);
    this.vertices.set(key, { ...existing, ...metadata });
    return false;
  }

  /**
   * Adds an edge (relationship) between two vertices.
   * Automatically adds vertices if they do not yet exist.
   *
   * @param {string} sourceId - First vertex ID
   * @param {string} targetId - Second vertex ID
   * @param {number} [weight=1] - Weight of the connection (e.g. rating, session count)
   * @param {string} [type='mentorship'] - Relationship type ('mentorship', 'skill_teach', 'skill_learn', 'peer')
   * @param {boolean} [undirected=true] - If true, creates a symmetric bi-directional edge
   */
  addEdge(sourceId, targetId, weight = 1, type = "mentorship", undirected = true) {
    if (!sourceId || !targetId || sourceId === targetId) return;

    const u = String(sourceId);
    const v = String(targetId);

    if (!this.vertices.has(u)) this.addVertex(u);
    if (!this.vertices.has(v)) this.addVertex(v);

    const edgeUtoV = {
      target: v,
      weight: parseFloat(weight) || 1,
      type: String(type),
      updatedAt: new Date(),
    };

    this.adjacencyList.get(u).set(v, edgeUtoV);

    if (undirected) {
      const edgeVtoU = {
        target: u,
        weight: parseFloat(weight) || 1,
        type: String(type),
        updatedAt: new Date(),
      };
      this.adjacencyList.get(v).set(u, edgeVtoU);
    }
  }

  /**
   * Retrieves all neighbors adjacent to a given vertex.
   *
   * @param {string} vertexId - The vertex ID to inspect
   * @returns {Array<object>} Array of neighbor edges: [{ target, weight, type }]
   */
  getNeighbors(vertexId) {
    const key = String(vertexId);
    if (!this.adjacencyList.has(key)) return [];
    return Array.from(this.adjacencyList.get(key).values());
  }

  /**
   * Checks if a vertex exists in the graph.
   *
   * @param {string} vertexId - Vertex identifier
   * @returns {boolean}
   */
  hasVertex(vertexId) {
    return this.vertices.has(String(vertexId));
  }

  /**
   * Checks if an edge exists between two vertices.
   *
   * @param {string} sourceId - First vertex ID
   * @param {string} targetId - Second vertex ID
   * @returns {boolean}
   */
  hasEdge(sourceId, targetId) {
    const u = String(sourceId);
    const v = String(targetId);
    return this.adjacencyList.has(u) && this.adjacencyList.get(u).has(v);
  }

  /**
   * Returns the weight of the edge between two vertices, or null if no edge exists.
   *
   * @param {string} sourceId - Source vertex ID
   * @param {string} targetId - Target vertex ID
   * @returns {number|null} Edge weight or null
   */
  getEdgeWeight(sourceId, targetId) {
    const u = String(sourceId);
    const v = String(targetId);
    if (this.hasEdge(u, v)) {
      return this.adjacencyList.get(u).get(v).weight;
    }
    return null;
  }

  /**
   * Updates an edge's weight (e.g. after receiving a new session review or rating).
   *
   * @param {string} sourceId - Source vertex ID
   * @param {string} targetId - Target vertex ID
   * @param {number} newWeight - Updated weight
   * @param {boolean} [undirected=true] - Update both directions if true
   */
  updateEdgeWeight(sourceId, targetId, newWeight, undirected = true) {
    const u = String(sourceId);
    const v = String(targetId);

    if (this.hasEdge(u, v)) {
      const edge = this.adjacencyList.get(u).get(v);
      edge.weight = parseFloat(newWeight) || 1;
      edge.updatedAt = new Date();
    } else {
      this.addEdge(u, v, newWeight, "mentorship", undirected);
      return;
    }

    if (undirected && this.hasEdge(v, u)) {
      const edgeRev = this.adjacencyList.get(v).get(u);
      edgeRev.weight = parseFloat(newWeight) || 1;
      edgeRev.updatedAt = new Date();
    }
  }

  /**
   * ALGORITHM: BREADTH-FIRST SEARCH (BFS)
   *
   * Finds the shortest path (in number of edges/hops) from a start vertex
   * to a target vertex, or computes shortest distances to all reachable vertices.
   *
   * HOW IT WORKS:
   * Uses a FIFO queue to visit vertices level-by-level (all 1-hop neighbors first,
   * then 2-hop neighbors, etc.). Guarantees the shortest path in unweighted edges.
   *
   * TIME COMPLEXITY: O(V + E)
   *
   * @param {string} startId - Source vertex ID
   * @param {string} [targetId=null] - Optional destination vertex ID
   * @returns {object} { distances: Map<id, number>, paths: Map<id, Array<string>>, shortestPath?: Array<string>, distance?: number }
   */
  bfs(startId, targetId = null) {
    const start = String(startId);
    const target = targetId ? String(targetId) : null;

    const distances = new Map();
    const predecessors = new Map();
    const visited = new Set();
    const queue = [];

    if (!this.hasVertex(start)) {
      return { distances, shortestPath: [], distance: Infinity };
    }

    // Initialize source
    queue.push(start);
    visited.add(start);
    distances.set(start, 0);
    predecessors.set(start, null);

    while (queue.length > 0) {
      const current = queue.shift();

      if (target && current === target) {
        break;
      }

      const currentDistance = distances.get(current);
      const neighbors = this.adjacencyList.get(current);

      if (neighbors) {
        for (const [neighborId] of neighbors) {
          if (!visited.has(neighborId)) {
            visited.add(neighborId);
            distances.set(neighborId, currentDistance + 1);
            predecessors.set(neighborId, current);
            queue.push(neighborId);
          }
        }
      }
    }

    // Helper to reconstruct path
    const reconstructPath = (node) => {
      const path = [];
      let step = node;
      while (step !== null && step !== undefined) {
        path.unshift(step);
        step = predecessors.get(step);
      }
      return path;
    };

    if (target) {
      const targetDistance = distances.has(target) ? distances.get(target) : Infinity;
      const targetPath = distances.has(target) ? reconstructPath(target) : [];
      return {
        distances,
        distance: targetDistance,
        shortestPath: targetPath,
      };
    }

    return { distances, reconstructPath };
  }

  /**
   * Calculates the degree of separation (network distance in hops) between two users.
   *
   * - Same user = 0
   * - Direct mentor/learner relationship = 1
   * - Shared mutual peer/mentor = 2
   * - Disconnected / Unreachable = Infinity
   *
   * @param {string} userA - First user ID
   * @param {string} userB - Second user ID
   * @returns {number} Number of hops, or Infinity if disconnected
   */
  getDegreesOfSeparation(userA, userB) {
    const u = String(userA);
    const v = String(userB);

    if (u === v) return 0;
    if (!this.hasVertex(u) || !this.hasVertex(v)) return Infinity;

    const { distance } = this.bfs(u, v);
    return distance;
  }

  /**
   * ALGORITHM: DEPTH-FIRST SEARCH (DFS)
   *
   * Explores as far as possible along each branch before backtracking.
   * Useful for discovering connected communities, skill clusters, or
   * testing reachability.
   *
   * TIME COMPLEXITY: O(V + E)
   *
   * @param {string} startId - Source vertex ID
   * @param {Set<string>} [visited=new Set()] - Set of visited vertex IDs
   * @param {Array<string>} [cluster=[]] - Result accumulator
   * @returns {Array<string>} List of all vertices in this connected cluster
   */
  dfs(startId, visited = new Set(), cluster = []) {
    const start = String(startId);
    if (!this.hasVertex(start) || visited.has(start)) {
      return cluster;
    }

    visited.add(start);
    cluster.push(start);

    const neighbors = this.adjacencyList.get(start);
    if (neighbors) {
      for (const [neighborId] of neighbors) {
        if (!visited.has(neighborId)) {
          this.dfs(neighborId, visited, cluster);
        }
      }
    }

    return cluster;
  }

  /**
   * Discovers all isolated connected components (communities) in the graph.
   *
   * @returns {Array<Array<string>>} Array of communities (each community is an array of vertex IDs)
   */
  findConnectedComponents() {
    const visited = new Set();
    const components = [];

    for (const [vertexId] of this.vertices) {
      if (!visited.has(vertexId)) {
        const component = this.dfs(vertexId, visited, []);
        components.push(component);
      }
    }

    return components;
  }

  /**
   * Finds mutual connections (shared peers / mentors) between two users.
   *
   * @param {string} userA - First user ID
   * @param {string} userB - Second user ID
   * @returns {Array<string>} Array of mutual vertex IDs
   */
  findMutualConnections(userA, userB) {
    const u = String(userA);
    const v = String(userB);

    if (!this.hasVertex(u) || !this.hasVertex(v)) return [];

    const neighborsA = new Set(this.adjacencyList.get(u).keys());
    const neighborsB = this.adjacencyList.get(v).keys();

    const mutual = [];
    for (const neighbor of neighborsB) {
      if (neighborsA.has(neighbor)) {
        mutual.push(neighbor);
      }
    }

    return mutual;
  }

  /**
   * Returns graph summary statistics.
   *
   * @returns {object} { vertexCount, edgeCount, density }
   */
  getStats() {
    let directedEdgeCount = 0;
    for (const [, neighbors] of this.adjacencyList) {
      directedEdgeCount += neighbors.size;
    }
    // Assuming undirected edges, divide by 2
    const edgeCount = Math.floor(directedEdgeCount / 2);
    const vertexCount = this.vertices.size;
    const maxEdges = vertexCount > 1 ? (vertexCount * (vertexCount - 1)) / 2 : 1;
    const density = vertexCount > 1 ? (edgeCount / maxEdges).toFixed(4) : "0.0000";

    return {
      vertexCount,
      edgeCount,
      density: parseFloat(density),
    };
  }

  /**
   * Clears all vertices and edges from the graph.
   */
  clear() {
    this.vertices.clear();
    this.adjacencyList.clear();
  }
}

module.exports = Graph;
