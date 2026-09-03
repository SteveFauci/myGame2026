import Phaser from 'phaser';

export default class PathFinder {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.maxSearchRange = options.maxSearchRange ?? 12;
  }

  getNextStep(start, goal, options = {}) {
    const path = this.findPath(start, goal, options);
    return path?.[0] ?? null;
  }

  findPath(start, goal, options = {}) {
    if (!start || !goal) {
      return null;
    }

    const maxSearchRange = options.maxSearchRange ?? this.maxSearchRange;
    const startDistance = Math.abs(goal.col - start.col) + Math.abs(goal.row - start.row);
    if (startDistance > maxSearchRange) {
      return null;
    }

    const openList = [];
    const nodeMap = new Map();
    const goalKey = this.getKey(goal.col, goal.row);

    const startNode = this.createNode(start.col, start.row, 0, this.getHeuristic(start, goal), null);
    openList.push(startNode);
    nodeMap.set(this.getKey(start.col, start.row), startNode);

    let steps = 0;
    while (openList.length > 0 && steps < 800) {
      const currentIndex = this.getBestOpenIndex(openList);
      const current = openList.splice(currentIndex, 1)[0];

      if (!current || current.closed) {
        continue;
      }

      current.open = false;
      current.closed = true;

      if (current.key === goalKey) {
        return this.reconstructPath(current);
      }

      this.getNeighbors(current).forEach((neighbor) => {
        if (neighbor.blocked && neighbor.key !== goalKey) {
          return;
        }

        const tentativeG = current.g + 1;
        if (tentativeG > maxSearchRange) {
          return;
        }

        const existing = nodeMap.get(neighbor.key);
        const hCost = this.getHeuristic(neighbor, goal);

        if (!existing) {
          const nextNode = this.createNode(
            neighbor.col,
            neighbor.row,
            tentativeG,
            hCost,
            current,
          );
          nodeMap.set(nextNode.key, nextNode);
          openList.push(nextNode);
          return;
        }

        if (tentativeG < existing.g) {
          existing.g = tentativeG;
          existing.h = hCost;
          existing.f = tentativeG + hCost;
          existing.parent = current;

          if (existing.closed) {
            existing.closed = false;
            existing.open = true;
            openList.push(existing);
          }
        }
      });

      steps += 1;
    }

    return null;
  }

  getBestOpenIndex(openList) {
    let bestIndex = 0;

    for (let index = 1; index < openList.length; index += 1) {
      const candidate = openList[index];
      const best = openList[bestIndex];

      if (candidate.f < best.f) {
        bestIndex = index;
        continue;
      }

      if (candidate.f === best.f) {
        if (candidate.h < best.h) {
          bestIndex = index;
          continue;
        }

        if (candidate.h === best.h && candidate.g < best.g) {
          bestIndex = index;
        }
      }
    }

    return bestIndex;
  }

  getNeighbors(node) {
    const neighbors = [];
    const candidates = [
      { col: node.col, row: node.row - 1 },
      { col: node.col - 1, row: node.row },
      { col: node.col, row: node.row + 1 },
      { col: node.col + 1, row: node.row },
    ];

    candidates.forEach((candidate) => {
      const blocked = this.isBlocked(candidate.col, candidate.row);
      neighbors.push({
        ...candidate,
        key: this.getKey(candidate.col, candidate.row),
        blocked,
      });
    });

    return neighbors;
  }

  isBlocked(col, row) {
    if (col < 0 || row < 0) {
      return true;
    }

    if (
      row >= this.scene.legacyMap.height
      || col >= (this.scene.legacyMap.tileRows[row]?.length ?? 0)
    ) {
      return true;
    }

    if (this.scene.isSolidTileAt(col, row)) {
      return true;
    }

    const cellCenterX = col * this.scene.tileSize + this.scene.tileSize / 2;
    const cellCenterY = row * this.scene.tileSize + this.scene.tileSize / 2;
    const cellBounds = new Phaser.Geom.Rectangle(
      cellCenterX - this.scene.tileSize / 2,
      cellCenterY - this.scene.tileSize / 2,
      this.scene.tileSize,
      this.scene.tileSize,
    );

    return this.scene.mapEntities.some((entity) => {
      if (!entity || entity.destroyed) {
        return false;
      }

      if (!(entity.blocksEnemies ?? entity.collision)) {
        return false;
      }

      const bounds = this.scene.getLegacyEntityBounds(entity);
      return Phaser.Geom.Intersects.RectangleToRectangle(cellBounds, bounds);
    });
  }

  createNode(col, row, g, h, parent) {
    return {
      col,
      row,
      key: this.getKey(col, row),
      g,
      h,
      f: g + h,
      parent,
      open: true,
      closed: false,
    };
  }

  getHeuristic(node, goal) {
    return Math.abs(goal.col - node.col) + Math.abs(goal.row - node.row);
  }

  reconstructPath(node) {
    const path = [];
    let current = node;

    while (current?.parent) {
      path.unshift({ col: current.col, row: current.row });
      current = current.parent;
    }

    return path;
  }

  getKey(col, row) {
    return `${col},${row}`;
  }
}
