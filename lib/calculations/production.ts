export interface IngredientCostInput {
  inventoryItemId: string;
  category: string;
  quantity: number;
  unitCost: number;
}

export interface ProductionCostSummary {
  rawMaterialCost: number;
  packagingCost: number;
  totalProductionCost: number;
  costPerUnit: number;
  costPerLiter: number;
  yieldPercent: number;
  wasteRatePercent: number;
}

export function calculateProductionMetrics(params: {
  ingredients: IngredientCostInput[];
  expectedOutput: number;
  actualOutput: number;
  wasteBottles?: number;
  bottleVolumeMl?: number; // e.g. 180 for 180ml, 1000 for 1L
}): ProductionCostSummary {
  let rawMaterialCost = 0;
  let packagingCost = 0;

  for (const item of params.ingredients) {
    const cost = item.quantity * item.unitCost;
    const cat = item.category?.toLowerCase() || '';
    if (
      cat.includes('packaging') ||
      cat.includes('bottle') ||
      cat.includes('cap') ||
      cat.includes('label') ||
      cat.includes('box')
    ) {
      packagingCost += cost;
    } else {
      rawMaterialCost += cost;
    }
  }

  const totalProductionCost = rawMaterialCost + packagingCost;
  const actual = params.actualOutput > 0 ? params.actualOutput : 1;
  const expected = params.expectedOutput > 0 ? params.expectedOutput : actual;

  const costPerUnit = totalProductionCost / actual;
  const yieldPercent = (params.actualOutput / expected) * 100;

  const bottleVolumeMl = params.bottleVolumeMl || 180;
  const totalVolumeLiters = (actual * bottleVolumeMl) / 1000;
  const costPerLiter = totalVolumeLiters > 0 ? totalProductionCost / totalVolumeLiters : 0;

  const waste = params.wasteBottles || 0;
  const totalProducedWithWaste = actual + waste;
  const wasteRatePercent =
    totalProducedWithWaste > 0 ? (waste / totalProducedWithWaste) * 100 : 0;

  return {
    rawMaterialCost: Math.round(rawMaterialCost * 100) / 100,
    packagingCost: Math.round(packagingCost * 100) / 100,
    totalProductionCost: Math.round(totalProductionCost * 100) / 100,
    costPerUnit: Math.round(costPerUnit * 100) / 100,
    costPerLiter: Math.round(costPerLiter * 100) / 100,
    yieldPercent: Math.round(yieldPercent * 10) / 10,
    wasteRatePercent: Math.round(wasteRatePercent * 10) / 10,
  };
}
