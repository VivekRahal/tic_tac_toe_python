export type RICSDashboardCost = {
  item: string
  min: number
  max: number
}

export type RICSDashboardLevel1Rating = {
  element: string
  rating: number
  note: string
}

export type RICSDashboardLevel1 = {
  ratings: RICSDashboardLevel1Rating[]
  advice: string
}

export type RICSDashboardLevel2 = {
  investigations: string[]
  remediation: string[]
}

export type RICSDashboardLevel3 = {
  intrusive: string[]
  risks: string[]
  heavyCosts: RICSDashboardCost[]
}

export type RICSDashboardVerdict = {
  condition: string
  risk: string
  stance: string
}

export type RICSDashboardCase = {
  id: string
  title: string
  address: string
  imageUrl: string
  property?: {
    address?: string
    city?: string
    postcode?: string
  }
  verdict: RICSDashboardVerdict
  highlights: string[]
  likelyCauses: string[]
  level1: RICSDashboardLevel1
  level2: RICSDashboardLevel2
  level3: RICSDashboardLevel3
  costs: RICSDashboardCost[]
  checklist: string[]
  allowance: string
}

export type RICSDashboardData = {
  cases: RICSDashboardCase[]
}
