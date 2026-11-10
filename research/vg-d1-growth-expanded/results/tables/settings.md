# Complete effective settings (role holders of every frozen set and every control; inactive flags and allocator settings included)

Every final-set member's settings are also in `FROZEN_SELECTION.json` (`finalSet[].settings`); the controls' in `CONTROL_MANIFEST.json`.

## indep/V_VGT-rise#3 balanced

```json
{
 "id": "9f7826fef7c18902",
 "priority3QuadId": "4d29c66a0d673fff",
 "inclusion": "V",
 "enabled": [
  "D1:GDX",
  "D1:VGT",
  "G:VGT"
 ],
 "d1": {
  "GDX": {
   "grid": {
    "targetPercentChange": 260,
    "trailingBuyPercentage": 14,
    "trailingStopPercentage": 53,
    "maximumHoldDays": 3,
    "tickWindowSize": 38,
    "intradayLossBuffer": 1,
    "pullback": 198,
    "continuationWindow": 178
   },
   "unit": "tenths of a percentage point / days / sessions",
   "strategyParams": {
    "key": "d1",
    "label": "GDX d1-260,14,53,3,38,1,198,178",
    "entryMode": "deep",
    "postExit": true,
    "stopPolicy": "net",
    "targetPercentChange": 0.26,
    "tickWindowSize": 38,
    "trailingBuyPercentage": 0.014,
    "trailingStopPercentage": 0.053,
    "maximumHoldDays": 3,
    "intradayLossBuffer": 0.001,
    "pullback": 0.198,
    "continuationWindow": 178,
    "swingLookback": "__NaN",
    "swingProximity": "__NaN"
   }
  },
  "VGT": {
   "grid": {
    "targetPercentChange": 226,
    "trailingBuyPercentage": 44,
    "trailingStopPercentage": 53,
    "maximumHoldDays": 22,
    "tickWindowSize": 68,
    "intradayLossBuffer": 23,
    "pullback": 165,
    "continuationWindow": 30
   },
   "unit": "tenths of a percentage point / days / sessions",
   "strategyParams": {
    "key": "d1",
    "label": "VGT d1-226,44,53,22,68,23,165,30",
    "entryMode": "deep",
    "postExit": true,
    "stopPolicy": "net",
    "targetPercentChange": 0.226,
    "tickWindowSize": 68,
    "trailingBuyPercentage": 0.044,
    "trailingStopPercentage": 0.053,
    "maximumHoldDays": 22,
    "intradayLossBuffer": 0.023,
    "pullback": 0.165,
    "continuationWindow": 30,
    "swingLookback": "__NaN",
    "swingProximity": "__NaN"
   }
  }
 },
 "growth": {
  "GDX": {
   "enabled": false,
   "placeholderIdentity": "1af5b55987a56e2f",
   "note": "disabled: never run or funded (placeholder vector)"
  },
  "VGT": {
   "enabled": true,
   "identity": "e427132237dda0f4",
   "effective": {
    "entryMethod": "rise_from_recent_low",
    "advanceFromRecentLowPercent": 5,
    "recentLowLookbackBars": 80,
    "trendFilterEnabled": true,
    "trendMethod": "price_change",
    "trendChangeLookbackSessions": 120,
    "trendChangeMinimumReturnPercent": -4.5,
    "eligibilityEnabled": true,
    "eligibilityPolicy": "minimum_strength",
    "eligibilityMaxAgeSessions": 8,
    "eligibilityMinimumAdvancePercent": 2.5,
    "drawdownRecoveryGateEnabled": true,
    "dipLookbackSessions": 90,
    "dipThresholdPercent": 13,
    "recoveryRetracementPercent": 70,
    "recoveryConfirmationSessions": 6,
    "trailingStopPercent": 6,
    "maximumHoldEnabled": true,
    "maximumHoldDays": 26,
    "intradayLossBufferEnabled": false,
    "initialStopEnabled": true,
    "initialStopAtrSessions": 45,
    "initialStopAtrMultiple": 1.5,
    "retentionEnabled": false,
    "continuationEnabled": false,
    "costBpsPerSide": 5
   },
   "engineParams": {
    "advanceFromRecentLowPercent": 5,
    "recentLowLookbackBars": 80,
    "resolution": "1d",
    "trailingStopPercent": 6,
    "maximumHoldEnabled": true,
    "maximumHoldDays": 26,
    "intradayLossBufferEnabled": false,
    "intradayLossBufferPercent": "__NaN",
    "costBpsPerSide": 5,
    "continuation": null,
    "trendFilter": {
     "method": "price_change",
     "lookbackSessions": 120,
     "minimumReturnPercent": -4.5
    },
    "eligibility": {
     "policy": "minimum_strength",
     "maxAgeSessions": 8,
     "minimumAdvancePercent": 2.5
    },
    "initialStop": {
     "atrSessions": 45,
     "atrMultiple": 1.5
    },
    "drawdownGate": {
     "lookbackSessions": 90,
     "dipThresholdPercent": 13,
     "recoveryRetracementPercent": 70,
     "confirmationSessions": 6
    }
   }
  }
 },
 "allocator": {
  "lifecycle": "L0 (current virtual-book model: a refused entry keeps its virtual trade; funding never feeds back)",
  "architecture": "A: one exclusive funded slot",
  "principalBudget": 100000,
  "compounding": false,
  "preemption": false,
  "simultaneousFundedPositions": false,
  "partialExitReleasesSlot": false,
  "sameInstantOrder": [
   "D1:GDX",
   "D1:VGT",
   "G:GDX",
   "G:VGT"
  ],
  "costBpsPerSide": 5,
  "commission": 0,
  "interest": "11% simple annual on outstanding principal, calendar days / 365",
  "stopFill": "at the stop or the gapped open; no extra slippage",
  "shares": "fractional",
  "fundingFrom": "2016-01-04",
  "d1Arming": "harmonized: from the first session (each D1 machine arms once its reference high exists)",
  "d1DelayedEligibility": false
 }
}
```

## indep/G_GDX-breakout#1 profit

```json
{
 "id": "043d1cab196c7f78",
 "priority3QuadId": "dd91812f5a61d0ee",
 "inclusion": "G",
 "enabled": [
  "D1:GDX",
  "D1:VGT",
  "G:GDX"
 ],
 "d1": {
  "GDX": {
   "grid": {
    "targetPercentChange": 277,
    "trailingBuyPercentage": 11,
    "trailingStopPercentage": 66,
    "maximumHoldDays": 28,
    "tickWindowSize": 201,
    "intradayLossBuffer": 28,
    "pullback": 66,
    "continuationWindow": 13
   },
   "unit": "tenths of a percentage point / days / sessions",
   "strategyParams": {
    "key": "d1",
    "label": "GDX d1-277,11,66,28,201,28,66,13",
    "entryMode": "deep",
    "postExit": true,
    "stopPolicy": "net",
    "targetPercentChange": 0.277,
    "tickWindowSize": 201,
    "trailingBuyPercentage": 0.011,
    "trailingStopPercentage": 0.066,
    "maximumHoldDays": 28,
    "intradayLossBuffer": 0.028,
    "pullback": 0.066,
    "continuationWindow": 13,
    "swingLookback": "__NaN",
    "swingProximity": "__NaN"
   }
  },
  "VGT": {
   "grid": {
    "targetPercentChange": 298,
    "trailingBuyPercentage": 1,
    "trailingStopPercentage": 72,
    "maximumHoldDays": 6,
    "tickWindowSize": 153,
    "intradayLossBuffer": 45,
    "pullback": 199,
    "continuationWindow": 39
   },
   "unit": "tenths of a percentage point / days / sessions",
   "strategyParams": {
    "key": "d1",
    "label": "VGT d1-298,1,72,6,153,45,199,39",
    "entryMode": "deep",
    "postExit": true,
    "stopPolicy": "net",
    "targetPercentChange": 0.298,
    "tickWindowSize": 153,
    "trailingBuyPercentage": 0.001,
    "trailingStopPercentage": 0.072,
    "maximumHoldDays": 6,
    "intradayLossBuffer": 0.045,
    "pullback": 0.199,
    "continuationWindow": 39,
    "swingLookback": "__NaN",
    "swingProximity": "__NaN"
   }
  }
 },
 "growth": {
  "GDX": {
   "enabled": true,
   "identity": "34c322d265a19412",
   "effective": {
    "entryMethod": "trend_breakout",
    "breakoutSmaSessions": 10,
    "breakoutSlopeComparisonSessions": 40,
    "breakoutPriorHighSessions": 115,
    "trendFilterEnabled": true,
    "trendMethod": "rising_sma",
    "trendSmaSessions": 30,
    "trendSmaComparisonSessions": 27,
    "drawdownRecoveryGateEnabled": true,
    "dipLookbackSessions": 100,
    "dipThresholdPercent": 2.5,
    "recoveryRetracementPercent": 90,
    "recoveryConfirmationSessions": 5,
    "trailingStopPercent": 7,
    "maximumHoldEnabled": true,
    "maximumHoldDays": 26,
    "intradayLossBufferEnabled": false,
    "initialStopEnabled": true,
    "initialStopAtrSessions": 5,
    "initialStopAtrMultiple": 5,
    "retentionEnabled": false,
    "continuationEnabled": true,
    "continuationMethod": "classic_d1",
    "continuationWindowSessions": 90,
    "classicPullbackPercent": 12,
    "classicReboundPercent": 4.2,
    "costBpsPerSide": 5
   },
   "engineParams": {
    "advanceFromRecentLowPercent": "__NaN",
    "recentLowLookbackBars": "__NaN",
    "resolution": "1d",
    "trailingStopPercent": 7,
    "maximumHoldEnabled": true,
    "maximumHoldDays": 26,
    "intradayLossBufferEnabled": false,
    "intradayLossBufferPercent": "__NaN",
    "costBpsPerSide": 5,
    "continuation": {
     "method": "classic_d1",
     "windowSessions": 90,
     "pullbackPercent": 12,
     "reboundPercent": 4.2
    },
    "trendFilter": {
     "method": "rising_sma",
     "movingAverageSessions": 30,
     "slopeComparisonSessions": 27
    },
    "eligibility": null,
    "entryMethod": "trend_breakout",
    "breakout": {
     "smaSessions": 10,
     "slopeComparisonSessions": 40,
     "priorHighSessions": 115
    },
    "initialStop": {
     "atrSessions": 5,
     "atrMultiple": 5
    },
    "drawdownGate": {
     "lookbackSessions": 100,
     "dipThresholdPercent": 2.5,
     "recoveryRetracementPercent": 90,
     "confirmationSessions": 5
    }
   }
  },
  "VGT": {
   "enabled": false,
   "placeholderIdentity": "1af5b55987a56e2f",
   "note": "disabled: never run or funded (placeholder vector)"
  }
 },
 "allocator": {
  "lifecycle": "L0 (current virtual-book model: a refused entry keeps its virtual trade; funding never feeds back)",
  "architecture": "A: one exclusive funded slot",
  "principalBudget": 100000,
  "compounding": false,
  "preemption": false,
  "simultaneousFundedPositions": false,
  "partialExitReleasesSlot": false,
  "sameInstantOrder": [
   "D1:GDX",
   "D1:VGT",
   "G:GDX",
   "G:VGT"
  ],
  "costBpsPerSide": 5,
  "commission": 0,
  "interest": "11% simple annual on outstanding principal, calendar days / 365",
  "stopFill": "at the stop or the gapped open; no extra slippage",
  "shares": "fractional",
  "fundingFrom": "2016-01-04",
  "d1Arming": "harmonized: from the first session (each D1 machine arms once its reference high exists)",
  "d1DelayedEligibility": false
 }
}
```

## indep/G_GDX-breakout#2 balanced

```json
{
 "id": "4f13dc46b51567b0",
 "priority3QuadId": "fa25cf9a5863f89f",
 "inclusion": "G",
 "enabled": [
  "D1:GDX",
  "D1:VGT",
  "G:GDX"
 ],
 "d1": {
  "GDX": {
   "grid": {
    "targetPercentChange": 283,
    "trailingBuyPercentage": 6,
    "trailingStopPercentage": 57,
    "maximumHoldDays": 26,
    "tickWindowSize": 244,
    "intradayLossBuffer": 11,
    "pullback": 150,
    "continuationWindow": 36
   },
   "unit": "tenths of a percentage point / days / sessions",
   "strategyParams": {
    "key": "d1",
    "label": "GDX d1-283,6,57,26,244,11,150,36",
    "entryMode": "deep",
    "postExit": true,
    "stopPolicy": "net",
    "targetPercentChange": 0.283,
    "tickWindowSize": 244,
    "trailingBuyPercentage": 0.006,
    "trailingStopPercentage": 0.057,
    "maximumHoldDays": 26,
    "intradayLossBuffer": 0.011,
    "pullback": 0.15,
    "continuationWindow": 36,
    "swingLookback": "__NaN",
    "swingProximity": "__NaN"
   }
  },
  "VGT": {
   "grid": {
    "targetPercentChange": 299,
    "trailingBuyPercentage": 4,
    "trailingStopPercentage": 55,
    "maximumHoldDays": 29,
    "tickWindowSize": 190,
    "intradayLossBuffer": 7,
    "pullback": 188,
    "continuationWindow": 121
   },
   "unit": "tenths of a percentage point / days / sessions",
   "strategyParams": {
    "key": "d1",
    "label": "VGT d1-299,4,55,29,190,7,188,121",
    "entryMode": "deep",
    "postExit": true,
    "stopPolicy": "net",
    "targetPercentChange": 0.299,
    "tickWindowSize": 190,
    "trailingBuyPercentage": 0.004,
    "trailingStopPercentage": 0.055,
    "maximumHoldDays": 29,
    "intradayLossBuffer": 0.007,
    "pullback": 0.188,
    "continuationWindow": 121,
    "swingLookback": "__NaN",
    "swingProximity": "__NaN"
   }
  }
 },
 "growth": {
  "GDX": {
   "enabled": true,
   "identity": "b57db6b8f70b41dd",
   "effective": {
    "entryMethod": "trend_breakout",
    "breakoutSmaSessions": 180,
    "breakoutSlopeComparisonSessions": 105,
    "breakoutPriorHighSessions": 20,
    "trendFilterEnabled": false,
    "drawdownRecoveryGateEnabled": true,
    "dipLookbackSessions": 110,
    "dipThresholdPercent": 4,
    "recoveryRetracementPercent": 100,
    "recoveryConfirmationSessions": 4,
    "trailingStopPercent": 6,
    "maximumHoldEnabled": true,
    "maximumHoldDays": 23,
    "intradayLossBufferEnabled": false,
    "initialStopEnabled": true,
    "initialStopAtrSessions": 15,
    "initialStopAtrMultiple": 3,
    "retentionEnabled": true,
    "retentionSellPercent": 70,
    "retentionSmaSessions": 170,
    "retentionClosesBelow": 4,
    "continuationEnabled": true,
    "continuationMethod": "breakout",
    "continuationWindowSessions": 120,
    "breakoutBufferPercent": 1.25,
    "breakoutFormationBars": 18,
    "costBpsPerSide": 5
   },
   "engineParams": {
    "advanceFromRecentLowPercent": "__NaN",
    "recentLowLookbackBars": "__NaN",
    "resolution": "1d",
    "trailingStopPercent": 6,
    "maximumHoldEnabled": true,
    "maximumHoldDays": 23,
    "intradayLossBufferEnabled": false,
    "intradayLossBufferPercent": "__NaN",
    "costBpsPerSide": 5,
    "continuation": {
     "method": "breakout",
     "windowSessions": 120,
     "bufferPercent": 1.25,
     "formationBars": 18
    },
    "trendFilter": null,
    "eligibility": null,
    "entryMethod": "trend_breakout",
    "breakout": {
     "smaSessions": 180,
     "slopeComparisonSessions": 105,
     "priorHighSessions": 20
    },
    "initialStop": {
     "atrSessions": 15,
     "atrMultiple": 3
    },
    "retention": {
     "sellPercent": 70,
     "smaSessions": 170,
     "closesBelow": 4
    },
    "drawdownGate": {
     "lookbackSessions": 110,
     "dipThresholdPercent": 4,
     "recoveryRetracementPercent": 100,
     "confirmationSessions": 4
    }
   }
  },
  "VGT": {
   "enabled": false,
   "placeholderIdentity": "1af5b55987a56e2f",
   "note": "disabled: never run or funded (placeholder vector)"
  }
 },
 "allocator": {
  "lifecycle": "L0 (current virtual-book model: a refused entry keeps its virtual trade; funding never feeds back)",
  "architecture": "A: one exclusive funded slot",
  "principalBudget": 100000,
  "compounding": false,
  "preemption": false,
  "simultaneousFundedPositions": false,
  "partialExitReleasesSlot": false,
  "sameInstantOrder": [
   "D1:GDX",
   "D1:VGT",
   "G:GDX",
   "G:VGT"
  ],
  "costBpsPerSide": 5,
  "commission": 0,
  "interest": "11% simple annual on outstanding principal, calendar days / 365",
  "stopFill": "at the stop or the gapped open; no extra slippage",
  "shares": "fractional",
  "fundingFrom": "2016-01-04",
  "d1Arming": "harmonized: from the first session (each D1 machine arms once its reference high exists)",
  "d1DelayedEligibility": false
 }
}
```

## indep/G_GDX-breakout#5 profit order

```json
{
 "id": "5e06802f8346792f",
 "priority3QuadId": "971ba523aab837c3",
 "inclusion": "G",
 "enabled": [
  "D1:GDX",
  "D1:VGT",
  "G:GDX"
 ],
 "d1": {
  "GDX": {
   "grid": {
    "targetPercentChange": 278,
    "trailingBuyPercentage": 11,
    "trailingStopPercentage": 66,
    "maximumHoldDays": 28,
    "tickWindowSize": 218,
    "intradayLossBuffer": 29,
    "pullback": 83,
    "continuationWindow": 13
   },
   "unit": "tenths of a percentage point / days / sessions",
   "strategyParams": {
    "key": "d1",
    "label": "GDX d1-278,11,66,28,218,29,83,13",
    "entryMode": "deep",
    "postExit": true,
    "stopPolicy": "net",
    "targetPercentChange": 0.278,
    "tickWindowSize": 218,
    "trailingBuyPercentage": 0.011,
    "trailingStopPercentage": 0.066,
    "maximumHoldDays": 28,
    "intradayLossBuffer": 0.029,
    "pullback": 0.083,
    "continuationWindow": 13,
    "swingLookback": "__NaN",
    "swingProximity": "__NaN"
   }
  },
  "VGT": {
   "grid": {
    "targetPercentChange": 300,
    "trailingBuyPercentage": 3,
    "trailingStopPercentage": 71,
    "maximumHoldDays": 5,
    "tickWindowSize": 152,
    "intradayLossBuffer": 45,
    "pullback": 199,
    "continuationWindow": 36
   },
   "unit": "tenths of a percentage point / days / sessions",
   "strategyParams": {
    "key": "d1",
    "label": "VGT d1-300,3,71,5,152,45,199,36",
    "entryMode": "deep",
    "postExit": true,
    "stopPolicy": "net",
    "targetPercentChange": 0.3,
    "tickWindowSize": 152,
    "trailingBuyPercentage": 0.003,
    "trailingStopPercentage": 0.071,
    "maximumHoldDays": 5,
    "intradayLossBuffer": 0.045,
    "pullback": 0.199,
    "continuationWindow": 36,
    "swingLookback": "__NaN",
    "swingProximity": "__NaN"
   }
  }
 },
 "growth": {
  "GDX": {
   "enabled": true,
   "identity": "b37103a1a532b6b3",
   "effective": {
    "entryMethod": "trend_breakout",
    "breakoutSmaSessions": 10,
    "breakoutSlopeComparisonSessions": 40,
    "breakoutPriorHighSessions": 55,
    "trendFilterEnabled": true,
    "trendMethod": "rising_sma",
    "trendSmaSessions": 30,
    "trendSmaComparisonSessions": 28,
    "drawdownRecoveryGateEnabled": true,
    "dipLookbackSessions": 100,
    "dipThresholdPercent": 2.5,
    "recoveryRetracementPercent": 100,
    "recoveryConfirmationSessions": 5,
    "trailingStopPercent": 7,
    "maximumHoldEnabled": true,
    "maximumHoldDays": 26,
    "intradayLossBufferEnabled": false,
    "initialStopEnabled": true,
    "initialStopAtrSessions": 5,
    "initialStopAtrMultiple": 4.5,
    "retentionEnabled": false,
    "continuationEnabled": false,
    "costBpsPerSide": 5
   },
   "engineParams": {
    "advanceFromRecentLowPercent": "__NaN",
    "recentLowLookbackBars": "__NaN",
    "resolution": "1d",
    "trailingStopPercent": 7,
    "maximumHoldEnabled": true,
    "maximumHoldDays": 26,
    "intradayLossBufferEnabled": false,
    "intradayLossBufferPercent": "__NaN",
    "costBpsPerSide": 5,
    "continuation": null,
    "trendFilter": {
     "method": "rising_sma",
     "movingAverageSessions": 30,
     "slopeComparisonSessions": 28
    },
    "eligibility": null,
    "entryMethod": "trend_breakout",
    "breakout": {
     "smaSessions": 10,
     "slopeComparisonSessions": 40,
     "priorHighSessions": 55
    },
    "initialStop": {
     "atrSessions": 5,
     "atrMultiple": 4.5
    },
    "drawdownGate": {
     "lookbackSessions": 100,
     "dipThresholdPercent": 2.5,
     "recoveryRetracementPercent": 100,
     "confirmationSessions": 5
    }
   }
  },
  "VGT": {
   "enabled": false,
   "placeholderIdentity": "1af5b55987a56e2f",
   "note": "disabled: never run or funded (placeholder vector)"
  }
 },
 "allocator": {
  "lifecycle": "L0 (current virtual-book model: a refused entry keeps its virtual trade; funding never feeds back)",
  "architecture": "A: one exclusive funded slot",
  "principalBudget": 100000,
  "compounding": false,
  "preemption": false,
  "simultaneousFundedPositions": false,
  "partialExitReleasesSlot": false,
  "sameInstantOrder": [
   "D1:GDX",
   "D1:VGT",
   "G:GDX",
   "G:VGT"
  ],
  "costBpsPerSide": 5,
  "commission": 0,
  "interest": "11% simple annual on outstanding principal, calendar days / 365",
  "stopFill": "at the stop or the gapped open; no extra slippage",
  "shares": "fractional",
  "fundingFrom": "2016-01-04",
  "d1Arming": "harmonized: from the first session (each D1 machine arms once its reference high exists)",
  "d1DelayedEligibility": false
 }
}
```

## indep/B_GDX-rise_VGT-rise#1 profit

```json
{
 "id": "026d3e63a0a57b6a",
 "priority3QuadId": "0d8b8699a749a0f5",
 "inclusion": "B",
 "enabled": [
  "D1:GDX",
  "D1:VGT",
  "G:GDX",
  "G:VGT"
 ],
 "d1": {
  "GDX": {
   "grid": {
    "targetPercentChange": 263,
    "trailingBuyPercentage": 4,
    "trailingStopPercentage": 66,
    "maximumHoldDays": 5,
    "tickWindowSize": 40,
    "intradayLossBuffer": 39,
    "pullback": 93,
    "continuationWindow": 195
   },
   "unit": "tenths of a percentage point / days / sessions",
   "strategyParams": {
    "key": "d1",
    "label": "GDX d1-263,4,66,5,40,39,93,195",
    "entryMode": "deep",
    "postExit": true,
    "stopPolicy": "net",
    "targetPercentChange": 0.263,
    "tickWindowSize": 40,
    "trailingBuyPercentage": 0.004,
    "trailingStopPercentage": 0.066,
    "maximumHoldDays": 5,
    "intradayLossBuffer": 0.039,
    "pullback": 0.093,
    "continuationWindow": 195,
    "swingLookback": "__NaN",
    "swingProximity": "__NaN"
   }
  },
  "VGT": {
   "grid": {
    "targetPercentChange": 243,
    "trailingBuyPercentage": 12,
    "trailingStopPercentage": 67,
    "maximumHoldDays": 25,
    "tickWindowSize": 61,
    "intradayLossBuffer": 27,
    "pullback": 32,
    "continuationWindow": 175
   },
   "unit": "tenths of a percentage point / days / sessions",
   "strategyParams": {
    "key": "d1",
    "label": "VGT d1-243,12,67,25,61,27,32,175",
    "entryMode": "deep",
    "postExit": true,
    "stopPolicy": "net",
    "targetPercentChange": 0.243,
    "tickWindowSize": 61,
    "trailingBuyPercentage": 0.012,
    "trailingStopPercentage": 0.067,
    "maximumHoldDays": 25,
    "intradayLossBuffer": 0.027,
    "pullback": 0.032,
    "continuationWindow": 175,
    "swingLookback": "__NaN",
    "swingProximity": "__NaN"
   }
  }
 },
 "growth": {
  "GDX": {
   "enabled": true,
   "identity": "722940a337fbf816",
   "effective": {
    "entryMethod": "rise_from_recent_low",
    "advanceFromRecentLowPercent": 9.5,
    "recentLowLookbackBars": 240,
    "trendFilterEnabled": true,
    "trendMethod": "regression_slope",
    "trendSlopeLookbackSessions": 95,
    "trendSlopeMinimumPercent": 5,
    "eligibilityEnabled": false,
    "drawdownRecoveryGateEnabled": true,
    "dipLookbackSessions": 70,
    "dipThresholdPercent": 8,
    "recoveryRetracementPercent": 70,
    "recoveryConfirmationSessions": 3,
    "trailingStopPercent": 5.5,
    "maximumHoldEnabled": true,
    "maximumHoldDays": 20,
    "intradayLossBufferEnabled": false,
    "initialStopEnabled": false,
    "retentionEnabled": true,
    "retentionSellPercent": 10,
    "retentionSmaSessions": 160,
    "retentionClosesBelow": 2,
    "continuationEnabled": false,
    "costBpsPerSide": 5
   },
   "engineParams": {
    "advanceFromRecentLowPercent": 9.5,
    "recentLowLookbackBars": 240,
    "resolution": "1d",
    "trailingStopPercent": 5.5,
    "maximumHoldEnabled": true,
    "maximumHoldDays": 20,
    "intradayLossBufferEnabled": false,
    "intradayLossBufferPercent": "__NaN",
    "costBpsPerSide": 5,
    "continuation": null,
    "trendFilter": {
     "method": "regression_slope",
     "lookbackSessions": 95,
     "minimumSlopePercent": 5
    },
    "eligibility": null,
    "retention": {
     "sellPercent": 10,
     "smaSessions": 160,
     "closesBelow": 2
    },
    "drawdownGate": {
     "lookbackSessions": 70,
     "dipThresholdPercent": 8,
     "recoveryRetracementPercent": 70,
     "confirmationSessions": 3
    }
   }
  },
  "VGT": {
   "enabled": true,
   "identity": "b27c7c58616d840a",
   "effective": {
    "entryMethod": "rise_from_recent_low",
    "advanceFromRecentLowPercent": 10.5,
    "recentLowLookbackBars": 112,
    "trendFilterEnabled": true,
    "trendMethod": "price_change",
    "trendChangeLookbackSessions": 45,
    "trendChangeMinimumReturnPercent": -2,
    "eligibilityEnabled": true,
    "eligibilityPolicy": "maximum_extension",
    "eligibilityMaxAgeSessions": 10,
    "eligibilityMaximumExtensionPercent": 10,
    "drawdownRecoveryGateEnabled": true,
    "dipLookbackSessions": 50,
    "dipThresholdPercent": 10.5,
    "recoveryRetracementPercent": 60,
    "recoveryConfirmationSessions": 2,
    "trailingStopPercent": 9,
    "maximumHoldEnabled": true,
    "maximumHoldDays": 19,
    "intradayLossBufferEnabled": true,
    "intradayLossBufferPercent": 4,
    "initialStopEnabled": true,
    "initialStopAtrSessions": 20,
    "initialStopAtrMultiple": 3.5,
    "retentionEnabled": true,
    "retentionSellPercent": 50,
    "retentionSmaSessions": 180,
    "retentionClosesBelow": 3,
    "continuationEnabled": true,
    "continuationMethod": "shallow_pullback",
    "continuationWindowSessions": 80,
    "uptrendSmaBars": 20,
    "uptrendSlopeBars": 30,
    "uptrendMinimumRisePercent": 2.75,
    "pullbackMinimumPercent": 1.5,
    "pullbackMaximumPercent": 14,
    "recoveryPercent": 1.5,
    "costBpsPerSide": 5
   },
   "engineParams": {
    "advanceFromRecentLowPercent": 10.5,
    "recentLowLookbackBars": 112,
    "resolution": "1d",
    "trailingStopPercent": 9,
    "maximumHoldEnabled": true,
    "maximumHoldDays": 19,
    "intradayLossBufferEnabled": true,
    "intradayLossBufferPercent": 4,
    "costBpsPerSide": 5,
    "continuation": {
     "method": "shallow_pullback",
     "windowSessions": 80,
     "smaBars": 20,
     "slopeBars": 30,
     "minimumRisePercent": 2.75,
     "pullbackMinimumPercent": 1.5,
     "pullbackMaximumPercent": 14,
     "recoveryPercent": 1.5
    },
    "trendFilter": {
     "method": "price_change",
     "lookbackSessions": 45,
     "minimumReturnPercent": -2
    },
    "eligibility": {
     "policy": "maximum_extension",
     "maxAgeSessions": 10,
     "maximumExtensionPercent": 10
    },
    "initialStop": {
     "atrSessions": 20,
     "atrMultiple": 3.5
    },
    "retention": {
     "sellPercent": 50,
     "smaSessions": 180,
     "closesBelow": 3
    },
    "drawdownGate": {
     "lookbackSessions": 50,
     "dipThresholdPercent": 10.5,
     "recoveryRetracementPercent": 60,
     "confirmationSessions": 2
    }
   }
  }
 },
 "allocator": {
  "lifecycle": "L0 (current virtual-book model: a refused entry keeps its virtual trade; funding never feeds back)",
  "architecture": "A: one exclusive funded slot",
  "principalBudget": 100000,
  "compounding": false,
  "preemption": false,
  "simultaneousFundedPositions": false,
  "partialExitReleasesSlot": false,
  "sameInstantOrder": [
   "D1:GDX",
   "D1:VGT",
   "G:GDX",
   "G:VGT"
  ],
  "costBpsPerSide": 5,
  "commission": 0,
  "interest": "11% simple annual on outstanding principal, calendar days / 365",
  "stopFill": "at the stop or the gapped open; no extra slippage",
  "shares": "fractional",
  "fundingFrom": "2016-01-04",
  "d1Arming": "harmonized: from the first session (each D1 machine arms once its reference high exists)",
  "d1DelayedEligibility": false
 }
}
```

## indep/B_GDX-rise_VGT-breakout#2 robust

```json
{
 "id": "3ef19366bf41a3b3",
 "priority3QuadId": "8c3b16e1201e0bbb",
 "inclusion": "B",
 "enabled": [
  "D1:GDX",
  "D1:VGT",
  "G:GDX",
  "G:VGT"
 ],
 "d1": {
  "GDX": {
   "grid": {
    "targetPercentChange": 292,
    "trailingBuyPercentage": 7,
    "trailingStopPercentage": 70,
    "maximumHoldDays": 18,
    "tickWindowSize": 22,
    "intradayLossBuffer": 57,
    "pullback": 138,
    "continuationWindow": 14
   },
   "unit": "tenths of a percentage point / days / sessions",
   "strategyParams": {
    "key": "d1",
    "label": "GDX d1-292,7,70,18,22,57,138,14",
    "entryMode": "deep",
    "postExit": true,
    "stopPolicy": "net",
    "targetPercentChange": 0.292,
    "tickWindowSize": 22,
    "trailingBuyPercentage": 0.007,
    "trailingStopPercentage": 0.07,
    "maximumHoldDays": 18,
    "intradayLossBuffer": 0.057,
    "pullback": 0.138,
    "continuationWindow": 14,
    "swingLookback": "__NaN",
    "swingProximity": "__NaN"
   }
  },
  "VGT": {
   "grid": {
    "targetPercentChange": 234,
    "trailingBuyPercentage": 17,
    "trailingStopPercentage": 83,
    "maximumHoldDays": 16,
    "tickWindowSize": 73,
    "intradayLossBuffer": 20,
    "pullback": 180,
    "continuationWindow": 131
   },
   "unit": "tenths of a percentage point / days / sessions",
   "strategyParams": {
    "key": "d1",
    "label": "VGT d1-234,17,83,16,73,20,180,131",
    "entryMode": "deep",
    "postExit": true,
    "stopPolicy": "net",
    "targetPercentChange": 0.234,
    "tickWindowSize": 73,
    "trailingBuyPercentage": 0.017,
    "trailingStopPercentage": 0.083,
    "maximumHoldDays": 16,
    "intradayLossBuffer": 0.02,
    "pullback": 0.18,
    "continuationWindow": 131,
    "swingLookback": "__NaN",
    "swingProximity": "__NaN"
   }
  }
 },
 "growth": {
  "GDX": {
   "enabled": true,
   "identity": "c662613b3d7b1f7d",
   "effective": {
    "entryMethod": "rise_from_recent_low",
    "advanceFromRecentLowPercent": 5,
    "recentLowLookbackBars": 180,
    "trendFilterEnabled": true,
    "trendMethod": "higher_highs_lows",
    "trendStructureLookbackSessions": 82,
    "trendStructureMinimumIncreasePercent": 1.25,
    "eligibilityEnabled": true,
    "eligibilityPolicy": "deterioration",
    "eligibilityMaxAgeSessions": 8,
    "eligibilityDeteriorationDropPercent": 5.5,
    "drawdownRecoveryGateEnabled": true,
    "dipLookbackSessions": 30,
    "dipThresholdPercent": 3.5,
    "recoveryRetracementPercent": 70,
    "recoveryConfirmationSessions": 4,
    "trailingStopPercent": 10,
    "maximumHoldEnabled": false,
    "initialStopEnabled": true,
    "initialStopAtrSessions": 40,
    "initialStopAtrMultiple": 3.5,
    "retentionEnabled": false,
    "continuationEnabled": false,
    "costBpsPerSide": 5
   },
   "engineParams": {
    "advanceFromRecentLowPercent": 5,
    "recentLowLookbackBars": 180,
    "resolution": "1d",
    "trailingStopPercent": 10,
    "maximumHoldEnabled": false,
    "maximumHoldDays": "__NaN",
    "intradayLossBufferEnabled": false,
    "intradayLossBufferPercent": "__NaN",
    "costBpsPerSide": 5,
    "continuation": null,
    "trendFilter": {
     "method": "higher_highs_lows",
     "lookbackSessions": 82,
     "minimumStructureIncreasePercent": 1.25
    },
    "eligibility": {
     "policy": "deterioration",
     "maxAgeSessions": 8,
     "deteriorationDropPercent": 5.5
    },
    "initialStop": {
     "atrSessions": 40,
     "atrMultiple": 3.5
    },
    "drawdownGate": {
     "lookbackSessions": 30,
     "dipThresholdPercent": 3.5,
     "recoveryRetracementPercent": 70,
     "confirmationSessions": 4
    }
   }
  },
  "VGT": {
   "enabled": true,
   "identity": "e8ce3c9f0d942fda",
   "effective": {
    "entryMethod": "trend_breakout",
    "breakoutSmaSessions": 110,
    "breakoutSlopeComparisonSessions": 100,
    "breakoutPriorHighSessions": 5,
    "trendFilterEnabled": true,
    "trendMethod": "price_change",
    "trendChangeLookbackSessions": 120,
    "trendChangeMinimumReturnPercent": 7.8,
    "drawdownRecoveryGateEnabled": false,
    "trailingStopPercent": 4,
    "maximumHoldEnabled": false,
    "initialStopEnabled": false,
    "retentionEnabled": true,
    "retentionSellPercent": 70,
    "retentionSmaSessions": 100,
    "retentionClosesBelow": 2,
    "continuationEnabled": true,
    "continuationMethod": "ma_cross",
    "continuationWindowSessions": 130,
    "crossSmaBars": 30,
    "crossRisingBars": 7,
    "crossMinimumSlopePercent": 1.2,
    "crossMarginPercent": 2.75,
    "costBpsPerSide": 5
   },
   "engineParams": {
    "advanceFromRecentLowPercent": "__NaN",
    "recentLowLookbackBars": "__NaN",
    "resolution": "1d",
    "trailingStopPercent": 4,
    "maximumHoldEnabled": false,
    "maximumHoldDays": "__NaN",
    "intradayLossBufferEnabled": false,
    "intradayLossBufferPercent": "__NaN",
    "costBpsPerSide": 5,
    "continuation": {
     "method": "ma_cross",
     "windowSessions": 130,
     "smaBars": 30,
     "risingBars": 7,
     "minimumSlopePercent": 1.2,
     "marginPercent": 2.75
    },
    "trendFilter": {
     "method": "price_change",
     "lookbackSessions": 120,
     "minimumReturnPercent": 7.8
    },
    "eligibility": null,
    "entryMethod": "trend_breakout",
    "breakout": {
     "smaSessions": 110,
     "slopeComparisonSessions": 100,
     "priorHighSessions": 5
    },
    "retention": {
     "sellPercent": 70,
     "smaSessions": 100,
     "closesBelow": 2
    }
   }
  }
 },
 "allocator": {
  "lifecycle": "L0 (current virtual-book model: a refused entry keeps its virtual trade; funding never feeds back)",
  "architecture": "A: one exclusive funded slot",
  "principalBudget": 100000,
  "compounding": false,
  "preemption": false,
  "simultaneousFundedPositions": false,
  "partialExitReleasesSlot": false,
  "sameInstantOrder": [
   "D1:GDX",
   "D1:VGT",
   "G:GDX",
   "G:VGT"
  ],
  "costBpsPerSide": 5,
  "commission": 0,
  "interest": "11% simple annual on outstanding principal, calendar days / 365",
  "stopFill": "at the stop or the gapped open; no extra slippage",
  "shares": "fractional",
  "fundingFrom": "2016-01-04",
  "d1Arming": "harmonized: from the first session (each D1 machine arms once its reference high exists)",
  "d1DelayedEligibility": false
 }
}
```

## indep/B_GDX-breakout_VGT-breakout#4 profit order

```json
{
 "id": "203bf200366ec2e2",
 "priority3QuadId": "4c5de376e742d902",
 "inclusion": "B",
 "enabled": [
  "D1:GDX",
  "D1:VGT",
  "G:GDX",
  "G:VGT"
 ],
 "d1": {
  "GDX": {
   "grid": {
    "targetPercentChange": 274,
    "trailingBuyPercentage": 7,
    "trailingStopPercentage": 52,
    "maximumHoldDays": 10,
    "tickWindowSize": 241,
    "intradayLossBuffer": 25,
    "pullback": 144,
    "continuationWindow": 11
   },
   "unit": "tenths of a percentage point / days / sessions",
   "strategyParams": {
    "key": "d1",
    "label": "GDX d1-274,7,52,10,241,25,144,11",
    "entryMode": "deep",
    "postExit": true,
    "stopPolicy": "net",
    "targetPercentChange": 0.274,
    "tickWindowSize": 241,
    "trailingBuyPercentage": 0.007,
    "trailingStopPercentage": 0.052,
    "maximumHoldDays": 10,
    "intradayLossBuffer": 0.025,
    "pullback": 0.144,
    "continuationWindow": 11,
    "swingLookback": "__NaN",
    "swingProximity": "__NaN"
   }
  },
  "VGT": {
   "grid": {
    "targetPercentChange": 288,
    "trailingBuyPercentage": 1,
    "trailingStopPercentage": 83,
    "maximumHoldDays": 4,
    "tickWindowSize": 160,
    "intradayLossBuffer": 26,
    "pullback": 41,
    "continuationWindow": 144
   },
   "unit": "tenths of a percentage point / days / sessions",
   "strategyParams": {
    "key": "d1",
    "label": "VGT d1-288,1,83,4,160,26,41,144",
    "entryMode": "deep",
    "postExit": true,
    "stopPolicy": "net",
    "targetPercentChange": 0.288,
    "tickWindowSize": 160,
    "trailingBuyPercentage": 0.001,
    "trailingStopPercentage": 0.083,
    "maximumHoldDays": 4,
    "intradayLossBuffer": 0.026,
    "pullback": 0.041,
    "continuationWindow": 144,
    "swingLookback": "__NaN",
    "swingProximity": "__NaN"
   }
  }
 },
 "growth": {
  "GDX": {
   "enabled": true,
   "identity": "c31f7e5a01dfe86f",
   "effective": {
    "entryMethod": "trend_breakout",
    "breakoutSmaSessions": 190,
    "breakoutSlopeComparisonSessions": 55,
    "breakoutPriorHighSessions": 45,
    "trendFilterEnabled": true,
    "trendMethod": "regression_slope",
    "trendSlopeLookbackSessions": 75,
    "trendSlopeMinimumPercent": -2,
    "drawdownRecoveryGateEnabled": true,
    "dipLookbackSessions": 70,
    "dipThresholdPercent": 7,
    "recoveryRetracementPercent": 100,
    "recoveryConfirmationSessions": 6,
    "trailingStopPercent": 4,
    "maximumHoldEnabled": true,
    "maximumHoldDays": 9,
    "intradayLossBufferEnabled": true,
    "intradayLossBufferPercent": 2,
    "initialStopEnabled": true,
    "initialStopAtrSessions": 50,
    "initialStopAtrMultiple": 2,
    "retentionEnabled": false,
    "continuationEnabled": true,
    "continuationMethod": "classic_d1",
    "continuationWindowSessions": 170,
    "classicPullbackPercent": 9.5,
    "classicReboundPercent": 0.4,
    "costBpsPerSide": 5
   },
   "engineParams": {
    "advanceFromRecentLowPercent": "__NaN",
    "recentLowLookbackBars": "__NaN",
    "resolution": "1d",
    "trailingStopPercent": 4,
    "maximumHoldEnabled": true,
    "maximumHoldDays": 9,
    "intradayLossBufferEnabled": true,
    "intradayLossBufferPercent": 2,
    "costBpsPerSide": 5,
    "continuation": {
     "method": "classic_d1",
     "windowSessions": 170,
     "pullbackPercent": 9.5,
     "reboundPercent": 0.4
    },
    "trendFilter": {
     "method": "regression_slope",
     "lookbackSessions": 75,
     "minimumSlopePercent": -2
    },
    "eligibility": null,
    "entryMethod": "trend_breakout",
    "breakout": {
     "smaSessions": 190,
     "slopeComparisonSessions": 55,
     "priorHighSessions": 45
    },
    "initialStop": {
     "atrSessions": 50,
     "atrMultiple": 2
    },
    "drawdownGate": {
     "lookbackSessions": 70,
     "dipThresholdPercent": 7,
     "recoveryRetracementPercent": 100,
     "confirmationSessions": 6
    }
   }
  },
  "VGT": {
   "enabled": true,
   "identity": "e647c04453012396",
   "effective": {
    "entryMethod": "trend_breakout",
    "breakoutSmaSessions": 40,
    "breakoutSlopeComparisonSessions": 10,
    "breakoutPriorHighSessions": 95,
    "trendFilterEnabled": true,
    "trendMethod": "rising_sma",
    "trendSmaSessions": 90,
    "trendSmaComparisonSessions": 2,
    "drawdownRecoveryGateEnabled": false,
    "trailingStopPercent": 6.5,
    "maximumHoldEnabled": true,
    "maximumHoldDays": 18,
    "intradayLossBufferEnabled": true,
    "intradayLossBufferPercent": 0,
    "initialStopEnabled": false,
    "retentionEnabled": false,
    "continuationEnabled": true,
    "continuationMethod": "shallow_pullback",
    "continuationWindowSessions": 150,
    "uptrendSmaBars": 110,
    "uptrendSlopeBars": 11,
    "uptrendMinimumRisePercent": 3.75,
    "pullbackMinimumPercent": 1,
    "pullbackMaximumPercent": 13,
    "recoveryPercent": 3,
    "costBpsPerSide": 5
   },
   "engineParams": {
    "advanceFromRecentLowPercent": "__NaN",
    "recentLowLookbackBars": "__NaN",
    "resolution": "1d",
    "trailingStopPercent": 6.5,
    "maximumHoldEnabled": true,
    "maximumHoldDays": 18,
    "intradayLossBufferEnabled": true,
    "intradayLossBufferPercent": 0,
    "costBpsPerSide": 5,
    "continuation": {
     "method": "shallow_pullback",
     "windowSessions": 150,
     "smaBars": 110,
     "slopeBars": 11,
     "minimumRisePercent": 3.75,
     "pullbackMinimumPercent": 1,
     "pullbackMaximumPercent": 13,
     "recoveryPercent": 3
    },
    "trendFilter": {
     "method": "rising_sma",
     "movingAverageSessions": 90,
     "slopeComparisonSessions": 2
    },
    "eligibility": null,
    "entryMethod": "trend_breakout",
    "breakout": {
     "smaSessions": 40,
     "slopeComparisonSessions": 10,
     "priorHighSessions": 95
    }
   }
  }
 },
 "allocator": {
  "lifecycle": "L0 (current virtual-book model: a refused entry keeps its virtual trade; funding never feeds back)",
  "architecture": "A: one exclusive funded slot",
  "principalBudget": 100000,
  "compounding": false,
  "preemption": false,
  "simultaneousFundedPositions": false,
  "partialExitReleasesSlot": false,
  "sameInstantOrder": [
   "D1:GDX",
   "D1:VGT",
   "G:GDX",
   "G:VGT"
  ],
  "costBpsPerSide": 5,
  "commission": 0,
  "interest": "11% simple annual on outstanding principal, calendar days / 365",
  "stopFill": "at the stop or the gapped open; no extra slippage",
  "shares": "fractional",
  "fundingFrom": "2016-01-04",
  "d1Arming": "harmonized: from the first session (each D1 machine arms once its reference high exists)",
  "d1DelayedEligibility": false
 }
}
```

## informed-fixed#1 profit

```json
{
 "id": "0f017f0ab9b26f24",
 "priority3QuadId": "07443ffaeef41e85",
 "inclusion": "V",
 "enabled": [
  "D1:GDX",
  "D1:VGT",
  "G:VGT"
 ],
 "d1": {
  "GDX": {
   "grid": {
    "targetPercentChange": 276,
    "trailingBuyPercentage": 1,
    "trailingStopPercentage": 57,
    "maximumHoldDays": 12,
    "tickWindowSize": 243,
    "intradayLossBuffer": 29,
    "pullback": 152,
    "continuationWindow": 12
   },
   "unit": "tenths of a percentage point / days / sessions",
   "strategyParams": {
    "key": "d1",
    "label": "GDX d1-276,1,57,12,243,29,152,12",
    "entryMode": "deep",
    "postExit": true,
    "stopPolicy": "net",
    "targetPercentChange": 0.276,
    "tickWindowSize": 243,
    "trailingBuyPercentage": 0.001,
    "trailingStopPercentage": 0.057,
    "maximumHoldDays": 12,
    "intradayLossBuffer": 0.029,
    "pullback": 0.152,
    "continuationWindow": 12,
    "swingLookback": "__NaN",
    "swingProximity": "__NaN"
   }
  },
  "VGT": {
   "grid": {
    "targetPercentChange": 235,
    "trailingBuyPercentage": 9,
    "trailingStopPercentage": 74,
    "maximumHoldDays": 15,
    "tickWindowSize": 78,
    "intradayLossBuffer": 44,
    "pullback": 110,
    "continuationWindow": 55
   },
   "unit": "tenths of a percentage point / days / sessions",
   "strategyParams": {
    "key": "d1",
    "label": "VGT d1-235,9,74,15,78,44,110,55",
    "entryMode": "deep",
    "postExit": true,
    "stopPolicy": "net",
    "targetPercentChange": 0.235,
    "tickWindowSize": 78,
    "trailingBuyPercentage": 0.009,
    "trailingStopPercentage": 0.074,
    "maximumHoldDays": 15,
    "intradayLossBuffer": 0.044,
    "pullback": 0.11,
    "continuationWindow": 55,
    "swingLookback": "__NaN",
    "swingProximity": "__NaN"
   }
  }
 },
 "growth": {
  "GDX": {
   "enabled": false,
   "placeholderIdentity": "1af5b55987a56e2f",
   "note": "disabled: never run or funded (placeholder vector)"
  },
  "VGT": {
   "enabled": true,
   "identity": "c3c1c0d56c4ee3b0",
   "effective": {
    "entryMethod": "rise_from_recent_low",
    "advanceFromRecentLowPercent": 5.8,
    "recentLowLookbackBars": 80,
    "trendFilterEnabled": false,
    "eligibilityEnabled": true,
    "eligibilityPolicy": "time_limited",
    "eligibilityMaxAgeSessions": 21,
    "drawdownRecoveryGateEnabled": true,
    "dipLookbackSessions": 64,
    "dipThresholdPercent": 12.4,
    "recoveryRetracementPercent": 48.9,
    "recoveryConfirmationSessions": 5,
    "trailingStopPercent": 5.7,
    "maximumHoldEnabled": true,
    "maximumHoldDays": 21,
    "intradayLossBufferEnabled": true,
    "intradayLossBufferPercent": 2.8,
    "initialStopEnabled": false,
    "retentionEnabled": false,
    "continuationEnabled": true,
    "continuationMethod": "shallow_pullback",
    "continuationWindowSessions": 60,
    "uptrendSmaBars": 43,
    "uptrendSlopeBars": 9,
    "uptrendMinimumRisePercent": 3.9,
    "pullbackMinimumPercent": 3,
    "pullbackMaximumPercent": 7.9,
    "recoveryPercent": 2.73,
    "costBpsPerSide": 5
   },
   "engineParams": {
    "advanceFromRecentLowPercent": 5.8,
    "recentLowLookbackBars": 80,
    "resolution": "1d",
    "trailingStopPercent": 5.7,
    "maximumHoldEnabled": true,
    "maximumHoldDays": 21,
    "intradayLossBufferEnabled": true,
    "intradayLossBufferPercent": 2.8,
    "costBpsPerSide": 5,
    "continuation": {
     "method": "shallow_pullback",
     "windowSessions": 60,
     "smaBars": 43,
     "slopeBars": 9,
     "minimumRisePercent": 3.9,
     "pullbackMinimumPercent": 3,
     "pullbackMaximumPercent": 7.9,
     "recoveryPercent": 2.73
    },
    "trendFilter": null,
    "eligibility": {
     "policy": "time_limited",
     "maxAgeSessions": 21
    },
    "drawdownGate": {
     "lookbackSessions": 64,
     "dipThresholdPercent": 12.4,
     "recoveryRetracementPercent": 48.9,
     "confirmationSessions": 5
    }
   }
  }
 },
 "allocator": {
  "lifecycle": "L0 (current virtual-book model: a refused entry keeps its virtual trade; funding never feeds back)",
  "architecture": "A: one exclusive funded slot",
  "principalBudget": 100000,
  "compounding": false,
  "preemption": false,
  "simultaneousFundedPositions": false,
  "partialExitReleasesSlot": false,
  "sameInstantOrder": [
   "D1:GDX",
   "D1:VGT",
   "G:GDX",
   "G:VGT"
  ],
  "costBpsPerSide": 5,
  "commission": 0,
  "interest": "11% simple annual on outstanding principal, calendar days / 365",
  "stopFill": "at the stop or the gapped open; no extra slippage",
  "shares": "fractional",
  "fundingFrom": "2016-01-04",
  "d1Arming": "harmonized: from the first session (each D1 machine arms once its reference high exists)",
  "d1DelayedEligibility": false
 }
}
```

## informed-fixed#3 balanced

```json
{
 "id": "ee1cf4e42c0b2236",
 "priority3QuadId": "22679341f25e58fe",
 "inclusion": "V",
 "enabled": [
  "D1:GDX",
  "D1:VGT",
  "G:VGT"
 ],
 "d1": {
  "GDX": {
   "grid": {
    "targetPercentChange": 276,
    "trailingBuyPercentage": 1,
    "trailingStopPercentage": 57,
    "maximumHoldDays": 12,
    "tickWindowSize": 243,
    "intradayLossBuffer": 29,
    "pullback": 152,
    "continuationWindow": 12
   },
   "unit": "tenths of a percentage point / days / sessions",
   "strategyParams": {
    "key": "d1",
    "label": "GDX d1-276,1,57,12,243,29,152,12",
    "entryMode": "deep",
    "postExit": true,
    "stopPolicy": "net",
    "targetPercentChange": 0.276,
    "tickWindowSize": 243,
    "trailingBuyPercentage": 0.001,
    "trailingStopPercentage": 0.057,
    "maximumHoldDays": 12,
    "intradayLossBuffer": 0.029,
    "pullback": 0.152,
    "continuationWindow": 12,
    "swingLookback": "__NaN",
    "swingProximity": "__NaN"
   }
  },
  "VGT": {
   "grid": {
    "targetPercentChange": 235,
    "trailingBuyPercentage": 9,
    "trailingStopPercentage": 74,
    "maximumHoldDays": 15,
    "tickWindowSize": 78,
    "intradayLossBuffer": 44,
    "pullback": 110,
    "continuationWindow": 55
   },
   "unit": "tenths of a percentage point / days / sessions",
   "strategyParams": {
    "key": "d1",
    "label": "VGT d1-235,9,74,15,78,44,110,55",
    "entryMode": "deep",
    "postExit": true,
    "stopPolicy": "net",
    "targetPercentChange": 0.235,
    "tickWindowSize": 78,
    "trailingBuyPercentage": 0.009,
    "trailingStopPercentage": 0.074,
    "maximumHoldDays": 15,
    "intradayLossBuffer": 0.044,
    "pullback": 0.11,
    "continuationWindow": 55,
    "swingLookback": "__NaN",
    "swingProximity": "__NaN"
   }
  }
 },
 "growth": {
  "GDX": {
   "enabled": false,
   "placeholderIdentity": "1af5b55987a56e2f",
   "note": "disabled: never run or funded (placeholder vector)"
  },
  "VGT": {
   "enabled": true,
   "identity": "3a482687296ae9b0",
   "effective": {
    "entryMethod": "rise_from_recent_low",
    "advanceFromRecentLowPercent": 1.3,
    "recentLowLookbackBars": 62,
    "trendFilterEnabled": true,
    "trendMethod": "price_change",
    "trendChangeLookbackSessions": 84,
    "trendChangeMinimumReturnPercent": -0.7,
    "eligibilityEnabled": true,
    "eligibilityPolicy": "maximum_extension",
    "eligibilityMaxAgeSessions": 19,
    "eligibilityMaximumExtensionPercent": 5.8,
    "drawdownRecoveryGateEnabled": true,
    "dipLookbackSessions": 58,
    "dipThresholdPercent": 12.8,
    "recoveryRetracementPercent": 69.6,
    "recoveryConfirmationSessions": 6,
    "trailingStopPercent": 5.6,
    "maximumHoldEnabled": true,
    "maximumHoldDays": 20,
    "intradayLossBufferEnabled": true,
    "intradayLossBufferPercent": 1.9,
    "initialStopEnabled": true,
    "initialStopAtrSessions": 39,
    "initialStopAtrMultiple": 4.3,
    "retentionEnabled": true,
    "retentionSellPercent": 50,
    "retentionSmaSessions": 105,
    "retentionClosesBelow": 3,
    "continuationEnabled": true,
    "continuationMethod": "breakout",
    "continuationWindowSessions": 69,
    "breakoutBufferPercent": 2.55,
    "breakoutFormationBars": 7,
    "costBpsPerSide": 5
   },
   "engineParams": {
    "advanceFromRecentLowPercent": 1.3,
    "recentLowLookbackBars": 62,
    "resolution": "1d",
    "trailingStopPercent": 5.6,
    "maximumHoldEnabled": true,
    "maximumHoldDays": 20,
    "intradayLossBufferEnabled": true,
    "intradayLossBufferPercent": 1.9,
    "costBpsPerSide": 5,
    "continuation": {
     "method": "breakout",
     "windowSessions": 69,
     "bufferPercent": 2.55,
     "formationBars": 7
    },
    "trendFilter": {
     "method": "price_change",
     "lookbackSessions": 84,
     "minimumReturnPercent": -0.7
    },
    "eligibility": {
     "policy": "maximum_extension",
     "maxAgeSessions": 19,
     "maximumExtensionPercent": 5.8
    },
    "initialStop": {
     "atrSessions": 39,
     "atrMultiple": 4.3
    },
    "retention": {
     "sellPercent": 50,
     "smaSessions": 105,
     "closesBelow": 3
    },
    "drawdownGate": {
     "lookbackSessions": 58,
     "dipThresholdPercent": 12.8,
     "recoveryRetracementPercent": 69.6,
     "confirmationSessions": 6
    }
   }
  }
 },
 "allocator": {
  "lifecycle": "L0 (current virtual-book model: a refused entry keeps its virtual trade; funding never feeds back)",
  "architecture": "A: one exclusive funded slot",
  "principalBudget": 100000,
  "compounding": false,
  "preemption": false,
  "simultaneousFundedPositions": false,
  "partialExitReleasesSlot": false,
  "sameInstantOrder": [
   "D1:GDX",
   "D1:VGT",
   "G:GDX",
   "G:VGT"
  ],
  "costBpsPerSide": 5,
  "commission": 0,
  "interest": "11% simple annual on outstanding principal, calendar days / 365",
  "stopFill": "at the stop or the gapped open; no extra slippage",
  "shares": "fractional",
  "fundingFrom": "2016-01-04",
  "d1Arming": "harmonized: from the first session (each D1 machine arms once its reference high exists)",
  "d1DelayedEligibility": false
 }
}
```

## informed-joint#1 profit

```json
{
 "id": "940fdaf770eedc9d",
 "priority3QuadId": "354aa9850b2cb48e",
 "inclusion": "V",
 "enabled": [
  "D1:GDX",
  "D1:VGT",
  "G:VGT"
 ],
 "d1": {
  "GDX": {
   "grid": {
    "targetPercentChange": 277,
    "trailingBuyPercentage": 1,
    "trailingStopPercentage": 61,
    "maximumHoldDays": 13,
    "tickWindowSize": 232,
    "intradayLossBuffer": 25,
    "pullback": 157,
    "continuationWindow": 12
   },
   "unit": "tenths of a percentage point / days / sessions",
   "strategyParams": {
    "key": "d1",
    "label": "GDX d1-277,1,61,13,232,25,157,12",
    "entryMode": "deep",
    "postExit": true,
    "stopPolicy": "net",
    "targetPercentChange": 0.277,
    "tickWindowSize": 232,
    "trailingBuyPercentage": 0.001,
    "trailingStopPercentage": 0.061,
    "maximumHoldDays": 13,
    "intradayLossBuffer": 0.025,
    "pullback": 0.157,
    "continuationWindow": 12,
    "swingLookback": "__NaN",
    "swingProximity": "__NaN"
   }
  },
  "VGT": {
   "grid": {
    "targetPercentChange": 238,
    "trailingBuyPercentage": 9,
    "trailingStopPercentage": 74,
    "maximumHoldDays": 15,
    "tickWindowSize": 72,
    "intradayLossBuffer": 42,
    "pullback": 103,
    "continuationWindow": 52
   },
   "unit": "tenths of a percentage point / days / sessions",
   "strategyParams": {
    "key": "d1",
    "label": "VGT d1-238,9,74,15,72,42,103,52",
    "entryMode": "deep",
    "postExit": true,
    "stopPolicy": "net",
    "targetPercentChange": 0.238,
    "tickWindowSize": 72,
    "trailingBuyPercentage": 0.009,
    "trailingStopPercentage": 0.074,
    "maximumHoldDays": 15,
    "intradayLossBuffer": 0.042,
    "pullback": 0.103,
    "continuationWindow": 52,
    "swingLookback": "__NaN",
    "swingProximity": "__NaN"
   }
  }
 },
 "growth": {
  "GDX": {
   "enabled": false,
   "placeholderIdentity": "1af5b55987a56e2f",
   "note": "disabled: never run or funded (placeholder vector)"
  },
  "VGT": {
   "enabled": true,
   "identity": "7dd6318957976c02",
   "effective": {
    "entryMethod": "rise_from_recent_low",
    "advanceFromRecentLowPercent": 5.6,
    "recentLowLookbackBars": 84,
    "trendFilterEnabled": false,
    "eligibilityEnabled": true,
    "eligibilityPolicy": "time_limited",
    "eligibilityMaxAgeSessions": 20,
    "drawdownRecoveryGateEnabled": true,
    "dipLookbackSessions": 64,
    "dipThresholdPercent": 11.9,
    "recoveryRetracementPercent": 46.2,
    "recoveryConfirmationSessions": 4,
    "trailingStopPercent": 5.7,
    "maximumHoldEnabled": true,
    "maximumHoldDays": 22,
    "intradayLossBufferEnabled": false,
    "initialStopEnabled": true,
    "initialStopAtrSessions": 16,
    "initialStopAtrMultiple": 1.2,
    "retentionEnabled": false,
    "continuationEnabled": true,
    "continuationMethod": "classic_d1",
    "continuationWindowSessions": 67,
    "classicPullbackPercent": 11.5,
    "classicReboundPercent": 2.6,
    "costBpsPerSide": 5
   },
   "engineParams": {
    "advanceFromRecentLowPercent": 5.6,
    "recentLowLookbackBars": 84,
    "resolution": "1d",
    "trailingStopPercent": 5.7,
    "maximumHoldEnabled": true,
    "maximumHoldDays": 22,
    "intradayLossBufferEnabled": false,
    "intradayLossBufferPercent": "__NaN",
    "costBpsPerSide": 5,
    "continuation": {
     "method": "classic_d1",
     "windowSessions": 67,
     "pullbackPercent": 11.5,
     "reboundPercent": 2.6
    },
    "trendFilter": null,
    "eligibility": {
     "policy": "time_limited",
     "maxAgeSessions": 20
    },
    "initialStop": {
     "atrSessions": 16,
     "atrMultiple": 1.2
    },
    "drawdownGate": {
     "lookbackSessions": 64,
     "dipThresholdPercent": 11.9,
     "recoveryRetracementPercent": 46.2,
     "confirmationSessions": 4
    }
   }
  }
 },
 "allocator": {
  "lifecycle": "L0 (current virtual-book model: a refused entry keeps its virtual trade; funding never feeds back)",
  "architecture": "A: one exclusive funded slot",
  "principalBudget": 100000,
  "compounding": false,
  "preemption": false,
  "simultaneousFundedPositions": false,
  "partialExitReleasesSlot": false,
  "sameInstantOrder": [
   "D1:GDX",
   "D1:VGT",
   "G:GDX",
   "G:VGT"
  ],
  "costBpsPerSide": 5,
  "commission": 0,
  "interest": "11% simple annual on outstanding principal, calendar days / 365",
  "stopFill": "at the stop or the gapped open; no extra slippage",
  "shares": "fractional",
  "fundingFrom": "2016-01-04",
  "d1Arming": "harmonized: from the first session (each D1 machine arms once its reference high exists)",
  "d1DelayedEligibility": false
 }
}
```

## informed-joint#2 robust

```json
{
 "id": "1051848294655d6e",
 "priority3QuadId": "57bbd0ad306ab156",
 "inclusion": "V",
 "enabled": [
  "D1:GDX",
  "D1:VGT",
  "G:VGT"
 ],
 "d1": {
  "GDX": {
   "grid": {
    "targetPercentChange": 273,
    "trailingBuyPercentage": 1,
    "trailingStopPercentage": 62,
    "maximumHoldDays": 12,
    "tickWindowSize": 242,
    "intradayLossBuffer": 31,
    "pullback": 153,
    "continuationWindow": 13
   },
   "unit": "tenths of a percentage point / days / sessions",
   "strategyParams": {
    "key": "d1",
    "label": "GDX d1-273,1,62,12,242,31,153,13",
    "entryMode": "deep",
    "postExit": true,
    "stopPolicy": "net",
    "targetPercentChange": 0.273,
    "tickWindowSize": 242,
    "trailingBuyPercentage": 0.001,
    "trailingStopPercentage": 0.062,
    "maximumHoldDays": 12,
    "intradayLossBuffer": 0.031,
    "pullback": 0.153,
    "continuationWindow": 13,
    "swingLookback": "__NaN",
    "swingProximity": "__NaN"
   }
  },
  "VGT": {
   "grid": {
    "targetPercentChange": 233,
    "trailingBuyPercentage": 10,
    "trailingStopPercentage": 75,
    "maximumHoldDays": 15,
    "tickWindowSize": 71,
    "intradayLossBuffer": 50,
    "pullback": 106,
    "continuationWindow": 53
   },
   "unit": "tenths of a percentage point / days / sessions",
   "strategyParams": {
    "key": "d1",
    "label": "VGT d1-233,10,75,15,71,50,106,53",
    "entryMode": "deep",
    "postExit": true,
    "stopPolicy": "net",
    "targetPercentChange": 0.233,
    "tickWindowSize": 71,
    "trailingBuyPercentage": 0.01,
    "trailingStopPercentage": 0.075,
    "maximumHoldDays": 15,
    "intradayLossBuffer": 0.05,
    "pullback": 0.106,
    "continuationWindow": 53,
    "swingLookback": "__NaN",
    "swingProximity": "__NaN"
   }
  }
 },
 "growth": {
  "GDX": {
   "enabled": false,
   "placeholderIdentity": "1af5b55987a56e2f",
   "note": "disabled: never run or funded (placeholder vector)"
  },
  "VGT": {
   "enabled": true,
   "identity": "af494128501e3e92",
   "effective": {
    "entryMethod": "rise_from_recent_low",
    "advanceFromRecentLowPercent": 5.9,
    "recentLowLookbackBars": 74,
    "trendFilterEnabled": false,
    "eligibilityEnabled": true,
    "eligibilityPolicy": "maximum_extension",
    "eligibilityMaxAgeSessions": 20,
    "eligibilityMaximumExtensionPercent": 4.7,
    "drawdownRecoveryGateEnabled": true,
    "dipLookbackSessions": 55,
    "dipThresholdPercent": 10.5,
    "recoveryRetracementPercent": 47.3,
    "recoveryConfirmationSessions": 3,
    "trailingStopPercent": 5.7,
    "maximumHoldEnabled": true,
    "maximumHoldDays": 20,
    "intradayLossBufferEnabled": true,
    "intradayLossBufferPercent": 3.2,
    "initialStopEnabled": false,
    "retentionEnabled": false,
    "continuationEnabled": true,
    "continuationMethod": "breakout",
    "continuationWindowSessions": 54,
    "breakoutBufferPercent": 2.5,
    "breakoutFormationBars": 10,
    "costBpsPerSide": 5
   },
   "engineParams": {
    "advanceFromRecentLowPercent": 5.9,
    "recentLowLookbackBars": 74,
    "resolution": "1d",
    "trailingStopPercent": 5.7,
    "maximumHoldEnabled": true,
    "maximumHoldDays": 20,
    "intradayLossBufferEnabled": true,
    "intradayLossBufferPercent": 3.2,
    "costBpsPerSide": 5,
    "continuation": {
     "method": "breakout",
     "windowSessions": 54,
     "bufferPercent": 2.5,
     "formationBars": 10
    },
    "trendFilter": null,
    "eligibility": {
     "policy": "maximum_extension",
     "maxAgeSessions": 20,
     "maximumExtensionPercent": 4.7
    },
    "drawdownGate": {
     "lookbackSessions": 55,
     "dipThresholdPercent": 10.5,
     "recoveryRetracementPercent": 47.3,
     "confirmationSessions": 3
    }
   }
  }
 },
 "allocator": {
  "lifecycle": "L0 (current virtual-book model: a refused entry keeps its virtual trade; funding never feeds back)",
  "architecture": "A: one exclusive funded slot",
  "principalBudget": 100000,
  "compounding": false,
  "preemption": false,
  "simultaneousFundedPositions": false,
  "partialExitReleasesSlot": false,
  "sameInstantOrder": [
   "D1:GDX",
   "D1:VGT",
   "G:GDX",
   "G:VGT"
  ],
  "costBpsPerSide": 5,
  "commission": 0,
  "interest": "11% simple annual on outstanding principal, calendar days / 365",
  "stopFill": "at the stop or the gapped open; no extra slippage",
  "shares": "fractional",
  "fundingFrom": "2016-01-04",
  "d1Arming": "harmonized: from the first session (each D1 machine arms once its reference high exists)",
  "d1DelayedEligibility": false
 }
}
```

## informed-joint#3 both Growth funded

```json
{
 "id": "f6b797363d32ec8b",
 "priority3QuadId": "b0a90d68c47d20b3",
 "inclusion": "B",
 "enabled": [
  "D1:GDX",
  "D1:VGT",
  "G:GDX",
  "G:VGT"
 ],
 "d1": {
  "GDX": {
   "grid": {
    "targetPercentChange": 277,
    "trailingBuyPercentage": 1,
    "trailingStopPercentage": 70,
    "maximumHoldDays": 12,
    "tickWindowSize": 242,
    "intradayLossBuffer": 20,
    "pullback": 153,
    "continuationWindow": 12
   },
   "unit": "tenths of a percentage point / days / sessions",
   "strategyParams": {
    "key": "d1",
    "label": "GDX d1-277,1,70,12,242,20,153,12",
    "entryMode": "deep",
    "postExit": true,
    "stopPolicy": "net",
    "targetPercentChange": 0.277,
    "tickWindowSize": 242,
    "trailingBuyPercentage": 0.001,
    "trailingStopPercentage": 0.07,
    "maximumHoldDays": 12,
    "intradayLossBuffer": 0.02,
    "pullback": 0.153,
    "continuationWindow": 12,
    "swingLookback": "__NaN",
    "swingProximity": "__NaN"
   }
  },
  "VGT": {
   "grid": {
    "targetPercentChange": 235,
    "trailingBuyPercentage": 9,
    "trailingStopPercentage": 74,
    "maximumHoldDays": 15,
    "tickWindowSize": 78,
    "intradayLossBuffer": 44,
    "pullback": 110,
    "continuationWindow": 45
   },
   "unit": "tenths of a percentage point / days / sessions",
   "strategyParams": {
    "key": "d1",
    "label": "VGT d1-235,9,74,15,78,44,110,45",
    "entryMode": "deep",
    "postExit": true,
    "stopPolicy": "net",
    "targetPercentChange": 0.235,
    "tickWindowSize": 78,
    "trailingBuyPercentage": 0.009,
    "trailingStopPercentage": 0.074,
    "maximumHoldDays": 15,
    "intradayLossBuffer": 0.044,
    "pullback": 0.11,
    "continuationWindow": 45,
    "swingLookback": "__NaN",
    "swingProximity": "__NaN"
   }
  }
 },
 "growth": {
  "GDX": {
   "enabled": true,
   "identity": "721d632c8042d699",
   "effective": {
    "entryMethod": "rise_from_recent_low",
    "advanceFromRecentLowPercent": 3.5,
    "recentLowLookbackBars": 150,
    "trendFilterEnabled": true,
    "trendMethod": "regression_slope",
    "trendSlopeLookbackSessions": 100,
    "trendSlopeMinimumPercent": -4,
    "eligibilityEnabled": true,
    "eligibilityPolicy": "deterioration",
    "eligibilityMaxAgeSessions": 15,
    "eligibilityDeteriorationDropPercent": 1.4,
    "drawdownRecoveryGateEnabled": false,
    "trailingStopPercent": 5,
    "maximumHoldEnabled": true,
    "maximumHoldDays": 4,
    "intradayLossBufferEnabled": false,
    "initialStopEnabled": false,
    "retentionEnabled": false,
    "continuationEnabled": true,
    "continuationMethod": "ma_cross",
    "continuationWindowSessions": 140,
    "crossSmaBars": 105,
    "crossRisingBars": 15,
    "crossMinimumSlopePercent": 1,
    "crossMarginPercent": 1.3,
    "costBpsPerSide": 5
   },
   "engineParams": {
    "advanceFromRecentLowPercent": 3.5,
    "recentLowLookbackBars": 150,
    "resolution": "1d",
    "trailingStopPercent": 5,
    "maximumHoldEnabled": true,
    "maximumHoldDays": 4,
    "intradayLossBufferEnabled": false,
    "intradayLossBufferPercent": "__NaN",
    "costBpsPerSide": 5,
    "continuation": {
     "method": "ma_cross",
     "windowSessions": 140,
     "smaBars": 105,
     "risingBars": 15,
     "minimumSlopePercent": 1,
     "marginPercent": 1.3
    },
    "trendFilter": {
     "method": "regression_slope",
     "lookbackSessions": 100,
     "minimumSlopePercent": -4
    },
    "eligibility": {
     "policy": "deterioration",
     "maxAgeSessions": 15,
     "deteriorationDropPercent": 1.4
    }
   }
  },
  "VGT": {
   "enabled": true,
   "identity": "51f3ece34fd76652",
   "effective": {
    "entryMethod": "rise_from_recent_low",
    "advanceFromRecentLowPercent": 7.2,
    "recentLowLookbackBars": 50,
    "trendFilterEnabled": true,
    "trendMethod": "rising_sma",
    "trendSmaSessions": 70,
    "trendSmaComparisonSessions": 8,
    "eligibilityEnabled": true,
    "eligibilityPolicy": "time_limited",
    "eligibilityMaxAgeSessions": 23,
    "drawdownRecoveryGateEnabled": false,
    "trailingStopPercent": 8.8,
    "maximumHoldEnabled": false,
    "initialStopEnabled": false,
    "retentionEnabled": true,
    "retentionSellPercent": 73,
    "retentionSmaSessions": 160,
    "retentionClosesBelow": 1,
    "continuationEnabled": true,
    "continuationMethod": "ma_cross",
    "continuationWindowSessions": 12,
    "crossSmaBars": 105,
    "crossRisingBars": 15,
    "crossMinimumSlopePercent": 1,
    "crossMarginPercent": 1.5,
    "costBpsPerSide": 5
   },
   "engineParams": {
    "advanceFromRecentLowPercent": 7.2,
    "recentLowLookbackBars": 50,
    "resolution": "1d",
    "trailingStopPercent": 8.8,
    "maximumHoldEnabled": false,
    "maximumHoldDays": "__NaN",
    "intradayLossBufferEnabled": false,
    "intradayLossBufferPercent": "__NaN",
    "costBpsPerSide": 5,
    "continuation": {
     "method": "ma_cross",
     "windowSessions": 12,
     "smaBars": 105,
     "risingBars": 15,
     "minimumSlopePercent": 1,
     "marginPercent": 1.5
    },
    "trendFilter": {
     "method": "rising_sma",
     "movingAverageSessions": 70,
     "slopeComparisonSessions": 8
    },
    "eligibility": {
     "policy": "time_limited",
     "maxAgeSessions": 23
    },
    "retention": {
     "sellPercent": 73,
     "smaSessions": 160,
     "closesBelow": 1
    }
   }
  }
 },
 "allocator": {
  "lifecycle": "L0 (current virtual-book model: a refused entry keeps its virtual trade; funding never feeds back)",
  "architecture": "A: one exclusive funded slot",
  "principalBudget": 100000,
  "compounding": false,
  "preemption": false,
  "simultaneousFundedPositions": false,
  "partialExitReleasesSlot": false,
  "sameInstantOrder": [
   "D1:GDX",
   "D1:VGT",
   "G:GDX",
   "G:VGT"
  ],
  "costBpsPerSide": 5,
  "commission": 0,
  "interest": "11% simple annual on outstanding principal, calendar days / 365",
  "stopFill": "at the stop or the gapped open; no extra slippage",
  "shares": "fractional",
  "fundingFrom": "2016-01-04",
  "d1Arming": "harmonized: from the first session (each D1 machine arms once its reference high exists)",
  "d1DelayedEligibility": false
 }
}
```

## informed-joint#6 profit order

```json
{
 "id": "9c73084ede067137",
 "priority3QuadId": "135db439c574008e",
 "inclusion": "V",
 "enabled": [
  "D1:GDX",
  "D1:VGT",
  "G:VGT"
 ],
 "d1": {
  "GDX": {
   "grid": {
    "targetPercentChange": 278,
    "trailingBuyPercentage": 2,
    "trailingStopPercentage": 62,
    "maximumHoldDays": 12,
    "tickWindowSize": 242,
    "intradayLossBuffer": 31,
    "pullback": 153,
    "continuationWindow": 13
   },
   "unit": "tenths of a percentage point / days / sessions",
   "strategyParams": {
    "key": "d1",
    "label": "GDX d1-278,2,62,12,242,31,153,13",
    "entryMode": "deep",
    "postExit": true,
    "stopPolicy": "net",
    "targetPercentChange": 0.278,
    "tickWindowSize": 242,
    "trailingBuyPercentage": 0.002,
    "trailingStopPercentage": 0.062,
    "maximumHoldDays": 12,
    "intradayLossBuffer": 0.031,
    "pullback": 0.153,
    "continuationWindow": 13,
    "swingLookback": "__NaN",
    "swingProximity": "__NaN"
   }
  },
  "VGT": {
   "grid": {
    "targetPercentChange": 232,
    "trailingBuyPercentage": 10,
    "trailingStopPercentage": 75,
    "maximumHoldDays": 15,
    "tickWindowSize": 74,
    "intradayLossBuffer": 45,
    "pullback": 106,
    "continuationWindow": 53
   },
   "unit": "tenths of a percentage point / days / sessions",
   "strategyParams": {
    "key": "d1",
    "label": "VGT d1-232,10,75,15,74,45,106,53",
    "entryMode": "deep",
    "postExit": true,
    "stopPolicy": "net",
    "targetPercentChange": 0.232,
    "tickWindowSize": 74,
    "trailingBuyPercentage": 0.01,
    "trailingStopPercentage": 0.075,
    "maximumHoldDays": 15,
    "intradayLossBuffer": 0.045,
    "pullback": 0.106,
    "continuationWindow": 53,
    "swingLookback": "__NaN",
    "swingProximity": "__NaN"
   }
  }
 },
 "growth": {
  "GDX": {
   "enabled": false,
   "placeholderIdentity": "1af5b55987a56e2f",
   "note": "disabled: never run or funded (placeholder vector)"
  },
  "VGT": {
   "enabled": true,
   "identity": "8fda7ddc090f6317",
   "effective": {
    "entryMethod": "rise_from_recent_low",
    "advanceFromRecentLowPercent": 5.9,
    "recentLowLookbackBars": 74,
    "trendFilterEnabled": false,
    "eligibilityEnabled": true,
    "eligibilityPolicy": "maximum_extension",
    "eligibilityMaxAgeSessions": 20,
    "eligibilityMaximumExtensionPercent": 5.2,
    "drawdownRecoveryGateEnabled": true,
    "dipLookbackSessions": 63,
    "dipThresholdPercent": 10.5,
    "recoveryRetracementPercent": 44.6,
    "recoveryConfirmationSessions": 3,
    "trailingStopPercent": 5.7,
    "maximumHoldEnabled": true,
    "maximumHoldDays": 20,
    "intradayLossBufferEnabled": false,
    "initialStopEnabled": false,
    "retentionEnabled": false,
    "continuationEnabled": true,
    "continuationMethod": "breakout",
    "continuationWindowSessions": 54,
    "breakoutBufferPercent": 2.5,
    "breakoutFormationBars": 10,
    "costBpsPerSide": 5
   },
   "engineParams": {
    "advanceFromRecentLowPercent": 5.9,
    "recentLowLookbackBars": 74,
    "resolution": "1d",
    "trailingStopPercent": 5.7,
    "maximumHoldEnabled": true,
    "maximumHoldDays": 20,
    "intradayLossBufferEnabled": false,
    "intradayLossBufferPercent": "__NaN",
    "costBpsPerSide": 5,
    "continuation": {
     "method": "breakout",
     "windowSessions": 54,
     "bufferPercent": 2.5,
     "formationBars": 10
    },
    "trendFilter": null,
    "eligibility": {
     "policy": "maximum_extension",
     "maxAgeSessions": 20,
     "maximumExtensionPercent": 5.2
    },
    "drawdownGate": {
     "lookbackSessions": 63,
     "dipThresholdPercent": 10.5,
     "recoveryRetracementPercent": 44.6,
     "confirmationSessions": 3
    }
   }
  }
 },
 "allocator": {
  "lifecycle": "L0 (current virtual-book model: a refused entry keeps its virtual trade; funding never feeds back)",
  "architecture": "A: one exclusive funded slot",
  "principalBudget": 100000,
  "compounding": false,
  "preemption": false,
  "simultaneousFundedPositions": false,
  "partialExitReleasesSlot": false,
  "sameInstantOrder": [
   "D1:GDX",
   "D1:VGT",
   "G:GDX",
   "G:VGT"
  ],
  "costBpsPerSide": 5,
  "commission": 0,
  "interest": "11% simple annual on outstanding principal, calendar days / 365",
  "stopFill": "at the stop or the gapped open; no extra slippage",
  "shares": "fractional",
  "fundingFrom": "2016-01-04",
  "d1Arming": "harmonized: from the first session (each D1 machine arms once its reference high exists)",
  "d1DelayedEligibility": false
 }
}
```

## C4

```json
{
 "id": "2f49a1cc226b4ece",
 "priority3QuadId": "f324035d15f69610",
 "inclusion": "V",
 "enabled": [
  "D1:GDX",
  "D1:VGT",
  "G:VGT"
 ],
 "d1": {
  "GDX": {
   "grid": {
    "targetPercentChange": 276,
    "trailingBuyPercentage": 1,
    "trailingStopPercentage": 57,
    "maximumHoldDays": 12,
    "tickWindowSize": 243,
    "intradayLossBuffer": 29,
    "pullback": 152,
    "continuationWindow": 12
   },
   "unit": "tenths of a percentage point / days / sessions",
   "strategyParams": {
    "key": "d1",
    "label": "GDX d1-276,1,57,12,243,29,152,12",
    "entryMode": "deep",
    "postExit": true,
    "stopPolicy": "net",
    "targetPercentChange": 0.276,
    "tickWindowSize": 243,
    "trailingBuyPercentage": 0.001,
    "trailingStopPercentage": 0.057,
    "maximumHoldDays": 12,
    "intradayLossBuffer": 0.029,
    "pullback": 0.152,
    "continuationWindow": 12,
    "swingLookback": "__NaN",
    "swingProximity": "__NaN"
   }
  },
  "VGT": {
   "grid": {
    "targetPercentChange": 235,
    "trailingBuyPercentage": 9,
    "trailingStopPercentage": 74,
    "maximumHoldDays": 15,
    "tickWindowSize": 78,
    "intradayLossBuffer": 44,
    "pullback": 110,
    "continuationWindow": 55
   },
   "unit": "tenths of a percentage point / days / sessions",
   "strategyParams": {
    "key": "d1",
    "label": "VGT d1-235,9,74,15,78,44,110,55",
    "entryMode": "deep",
    "postExit": true,
    "stopPolicy": "net",
    "targetPercentChange": 0.235,
    "tickWindowSize": 78,
    "trailingBuyPercentage": 0.009,
    "trailingStopPercentage": 0.074,
    "maximumHoldDays": 15,
    "intradayLossBuffer": 0.044,
    "pullback": 0.11,
    "continuationWindow": 55,
    "swingLookback": "__NaN",
    "swingProximity": "__NaN"
   }
  }
 },
 "growth": {
  "GDX": {
   "enabled": false,
   "placeholderIdentity": "1af5b55987a56e2f",
   "note": "disabled: never run or funded (placeholder vector)"
  },
  "VGT": {
   "enabled": true,
   "identity": "420cd989e4fa7749",
   "effective": {
    "entryMethod": "rise_from_recent_low",
    "advanceFromRecentLowPercent": 5,
    "recentLowLookbackBars": 90,
    "trendFilterEnabled": true,
    "trendMethod": "price_change",
    "trendChangeLookbackSessions": 30,
    "trendChangeMinimumReturnPercent": -2,
    "eligibilityEnabled": true,
    "eligibilityPolicy": "time_limited",
    "eligibilityMaxAgeSessions": 20,
    "drawdownRecoveryGateEnabled": true,
    "dipLookbackSessions": 60,
    "dipThresholdPercent": 10,
    "recoveryRetracementPercent": 45,
    "recoveryConfirmationSessions": 2,
    "trailingStopPercent": 6,
    "maximumHoldEnabled": true,
    "maximumHoldDays": 21,
    "intradayLossBufferEnabled": true,
    "intradayLossBufferPercent": 2.9,
    "initialStopEnabled": true,
    "initialStopAtrSessions": 20,
    "initialStopAtrMultiple": 1.5,
    "retentionEnabled": false,
    "continuationEnabled": true,
    "continuationMethod": "shallow_pullback",
    "continuationWindowSessions": 60,
    "uptrendSmaBars": 50,
    "uptrendSlopeBars": 10,
    "uptrendMinimumRisePercent": 0,
    "pullbackMinimumPercent": 1.5,
    "pullbackMaximumPercent": 8,
    "recoveryPercent": 1,
    "costBpsPerSide": 5
   },
   "engineParams": {
    "advanceFromRecentLowPercent": 5,
    "recentLowLookbackBars": 90,
    "resolution": "1d",
    "trailingStopPercent": 6,
    "maximumHoldEnabled": true,
    "maximumHoldDays": 21,
    "intradayLossBufferEnabled": true,
    "intradayLossBufferPercent": 2.9,
    "costBpsPerSide": 5,
    "continuation": {
     "method": "shallow_pullback",
     "windowSessions": 60,
     "smaBars": 50,
     "slopeBars": 10,
     "minimumRisePercent": 0,
     "pullbackMinimumPercent": 1.5,
     "pullbackMaximumPercent": 8,
     "recoveryPercent": 1
    },
    "trendFilter": {
     "method": "price_change",
     "lookbackSessions": 30,
     "minimumReturnPercent": -2
    },
    "eligibility": {
     "policy": "time_limited",
     "maxAgeSessions": 20
    },
    "initialStop": {
     "atrSessions": 20,
     "atrMultiple": 1.5
    },
    "drawdownGate": {
     "lookbackSessions": 60,
     "dipThresholdPercent": 10,
     "recoveryRetracementPercent": 45,
     "confirmationSessions": 2
    }
   }
  }
 },
 "allocator": {
  "lifecycle": "L0 (current virtual-book model: a refused entry keeps its virtual trade; funding never feeds back)",
  "architecture": "A: one exclusive funded slot",
  "principalBudget": 100000,
  "compounding": false,
  "preemption": false,
  "simultaneousFundedPositions": false,
  "partialExitReleasesSlot": false,
  "sameInstantOrder": [
   "D1:GDX",
   "D1:VGT",
   "G:GDX",
   "G:VGT"
  ],
  "costBpsPerSide": 5,
  "commission": 0,
  "interest": "11% simple annual on outstanding principal, calendar days / 365",
  "stopFill": "at the stop or the gapped open; no extra slippage",
  "shares": "fractional",
  "fundingFrom": "2016-01-04",
  "d1Arming": "harmonized: from the first session (each D1 machine arms once its reference high exists)",
  "d1DelayedEligibility": false
 }
}
```

## E

```json
{
 "id": "d7f95a68a63e638f",
 "priority3QuadId": "c45f4efa028203e9",
 "inclusion": "G",
 "enabled": [
  "D1:GDX",
  "D1:VGT",
  "G:GDX"
 ],
 "d1": {
  "GDX": {
   "grid": {
    "targetPercentChange": 276,
    "trailingBuyPercentage": 1,
    "trailingStopPercentage": 57,
    "maximumHoldDays": 12,
    "tickWindowSize": 243,
    "intradayLossBuffer": 29,
    "pullback": 152,
    "continuationWindow": 12
   },
   "unit": "tenths of a percentage point / days / sessions",
   "strategyParams": {
    "key": "d1",
    "label": "GDX d1-276,1,57,12,243,29,152,12",
    "entryMode": "deep",
    "postExit": true,
    "stopPolicy": "net",
    "targetPercentChange": 0.276,
    "tickWindowSize": 243,
    "trailingBuyPercentage": 0.001,
    "trailingStopPercentage": 0.057,
    "maximumHoldDays": 12,
    "intradayLossBuffer": 0.029,
    "pullback": 0.152,
    "continuationWindow": 12,
    "swingLookback": "__NaN",
    "swingProximity": "__NaN"
   }
  },
  "VGT": {
   "grid": {
    "targetPercentChange": 235,
    "trailingBuyPercentage": 9,
    "trailingStopPercentage": 74,
    "maximumHoldDays": 15,
    "tickWindowSize": 78,
    "intradayLossBuffer": 44,
    "pullback": 110,
    "continuationWindow": 55
   },
   "unit": "tenths of a percentage point / days / sessions",
   "strategyParams": {
    "key": "d1",
    "label": "VGT d1-235,9,74,15,78,44,110,55",
    "entryMode": "deep",
    "postExit": true,
    "stopPolicy": "net",
    "targetPercentChange": 0.235,
    "tickWindowSize": 78,
    "trailingBuyPercentage": 0.009,
    "trailingStopPercentage": 0.074,
    "maximumHoldDays": 15,
    "intradayLossBuffer": 0.044,
    "pullback": 0.11,
    "continuationWindow": 55,
    "swingLookback": "__NaN",
    "swingProximity": "__NaN"
   }
  }
 },
 "growth": {
  "GDX": {
   "enabled": true,
   "identity": "07cac3329fc7a520",
   "effective": {
    "entryMethod": "rise_from_recent_low",
    "advanceFromRecentLowPercent": 3,
    "recentLowLookbackBars": 22,
    "trendFilterEnabled": true,
    "trendMethod": "price_change",
    "trendChangeLookbackSessions": 30,
    "trendChangeMinimumReturnPercent": -2,
    "eligibilityEnabled": true,
    "eligibilityPolicy": "time_limited",
    "eligibilityMaxAgeSessions": 20,
    "drawdownRecoveryGateEnabled": true,
    "dipLookbackSessions": 60,
    "dipThresholdPercent": 10,
    "recoveryRetracementPercent": 49,
    "recoveryConfirmationSessions": 2,
    "trailingStopPercent": 7,
    "maximumHoldEnabled": false,
    "initialStopEnabled": true,
    "initialStopAtrSessions": 20,
    "initialStopAtrMultiple": 2,
    "retentionEnabled": false,
    "continuationEnabled": true,
    "continuationMethod": "shallow_pullback",
    "continuationWindowSessions": 60,
    "uptrendSmaBars": 50,
    "uptrendSlopeBars": 10,
    "uptrendMinimumRisePercent": 0,
    "pullbackMinimumPercent": 1.5,
    "pullbackMaximumPercent": 8,
    "recoveryPercent": 2,
    "costBpsPerSide": 5
   },
   "engineParams": {
    "advanceFromRecentLowPercent": 3,
    "recentLowLookbackBars": 22,
    "resolution": "1d",
    "trailingStopPercent": 7,
    "maximumHoldEnabled": false,
    "maximumHoldDays": "__NaN",
    "intradayLossBufferEnabled": false,
    "intradayLossBufferPercent": "__NaN",
    "costBpsPerSide": 5,
    "continuation": {
     "method": "shallow_pullback",
     "windowSessions": 60,
     "smaBars": 50,
     "slopeBars": 10,
     "minimumRisePercent": 0,
     "pullbackMinimumPercent": 1.5,
     "pullbackMaximumPercent": 8,
     "recoveryPercent": 2
    },
    "trendFilter": {
     "method": "price_change",
     "lookbackSessions": 30,
     "minimumReturnPercent": -2
    },
    "eligibility": {
     "policy": "time_limited",
     "maxAgeSessions": 20
    },
    "initialStop": {
     "atrSessions": 20,
     "atrMultiple": 2
    },
    "drawdownGate": {
     "lookbackSessions": 60,
     "dipThresholdPercent": 10,
     "recoveryRetracementPercent": 49,
     "confirmationSessions": 2
    }
   }
  },
  "VGT": {
   "enabled": false,
   "placeholderIdentity": "1af5b55987a56e2f",
   "note": "disabled: never run or funded (placeholder vector)"
  }
 },
 "allocator": {
  "lifecycle": "L0 (current virtual-book model: a refused entry keeps its virtual trade; funding never feeds back)",
  "architecture": "A: one exclusive funded slot",
  "principalBudget": 100000,
  "compounding": false,
  "preemption": false,
  "simultaneousFundedPositions": false,
  "partialExitReleasesSlot": false,
  "sameInstantOrder": [
   "D1:GDX",
   "D1:VGT",
   "G:GDX",
   "G:VGT"
  ],
  "costBpsPerSide": 5,
  "commission": 0,
  "interest": "11% simple annual on outstanding principal, calendar days / 365",
  "stopFill": "at the stop or the gapped open; no extra slippage",
  "shares": "fractional",
  "fundingFrom": "2016-01-04",
  "d1Arming": "harmonized: from the first session (each D1 machine arms once its reference high exists)",
  "d1DelayedEligibility": false
 }
}
```

## A

```json
{
 "id": "66f3dca63091dfa6",
 "priority3QuadId": "d4cde31356e2306a",
 "inclusion": "B",
 "enabled": [
  "D1:GDX",
  "D1:VGT",
  "G:GDX",
  "G:VGT"
 ],
 "d1": {
  "GDX": {
   "grid": {
    "targetPercentChange": 276,
    "trailingBuyPercentage": 1,
    "trailingStopPercentage": 57,
    "maximumHoldDays": 12,
    "tickWindowSize": 243,
    "intradayLossBuffer": 29,
    "pullback": 152,
    "continuationWindow": 12
   },
   "unit": "tenths of a percentage point / days / sessions",
   "strategyParams": {
    "key": "d1",
    "label": "GDX d1-276,1,57,12,243,29,152,12",
    "entryMode": "deep",
    "postExit": true,
    "stopPolicy": "net",
    "targetPercentChange": 0.276,
    "tickWindowSize": 243,
    "trailingBuyPercentage": 0.001,
    "trailingStopPercentage": 0.057,
    "maximumHoldDays": 12,
    "intradayLossBuffer": 0.029,
    "pullback": 0.152,
    "continuationWindow": 12,
    "swingLookback": "__NaN",
    "swingProximity": "__NaN"
   }
  },
  "VGT": {
   "grid": {
    "targetPercentChange": 235,
    "trailingBuyPercentage": 9,
    "trailingStopPercentage": 74,
    "maximumHoldDays": 15,
    "tickWindowSize": 78,
    "intradayLossBuffer": 44,
    "pullback": 110,
    "continuationWindow": 55
   },
   "unit": "tenths of a percentage point / days / sessions",
   "strategyParams": {
    "key": "d1",
    "label": "VGT d1-235,9,74,15,78,44,110,55",
    "entryMode": "deep",
    "postExit": true,
    "stopPolicy": "net",
    "targetPercentChange": 0.235,
    "tickWindowSize": 78,
    "trailingBuyPercentage": 0.009,
    "trailingStopPercentage": 0.074,
    "maximumHoldDays": 15,
    "intradayLossBuffer": 0.044,
    "pullback": 0.11,
    "continuationWindow": 55,
    "swingLookback": "__NaN",
    "swingProximity": "__NaN"
   }
  }
 },
 "growth": {
  "GDX": {
   "enabled": true,
   "identity": "07cac3329fc7a520",
   "effective": {
    "entryMethod": "rise_from_recent_low",
    "advanceFromRecentLowPercent": 3,
    "recentLowLookbackBars": 22,
    "trendFilterEnabled": true,
    "trendMethod": "price_change",
    "trendChangeLookbackSessions": 30,
    "trendChangeMinimumReturnPercent": -2,
    "eligibilityEnabled": true,
    "eligibilityPolicy": "time_limited",
    "eligibilityMaxAgeSessions": 20,
    "drawdownRecoveryGateEnabled": true,
    "dipLookbackSessions": 60,
    "dipThresholdPercent": 10,
    "recoveryRetracementPercent": 49,
    "recoveryConfirmationSessions": 2,
    "trailingStopPercent": 7,
    "maximumHoldEnabled": false,
    "initialStopEnabled": true,
    "initialStopAtrSessions": 20,
    "initialStopAtrMultiple": 2,
    "retentionEnabled": false,
    "continuationEnabled": true,
    "continuationMethod": "shallow_pullback",
    "continuationWindowSessions": 60,
    "uptrendSmaBars": 50,
    "uptrendSlopeBars": 10,
    "uptrendMinimumRisePercent": 0,
    "pullbackMinimumPercent": 1.5,
    "pullbackMaximumPercent": 8,
    "recoveryPercent": 2,
    "costBpsPerSide": 5
   },
   "engineParams": {
    "advanceFromRecentLowPercent": 3,
    "recentLowLookbackBars": 22,
    "resolution": "1d",
    "trailingStopPercent": 7,
    "maximumHoldEnabled": false,
    "maximumHoldDays": "__NaN",
    "intradayLossBufferEnabled": false,
    "intradayLossBufferPercent": "__NaN",
    "costBpsPerSide": 5,
    "continuation": {
     "method": "shallow_pullback",
     "windowSessions": 60,
     "smaBars": 50,
     "slopeBars": 10,
     "minimumRisePercent": 0,
     "pullbackMinimumPercent": 1.5,
     "pullbackMaximumPercent": 8,
     "recoveryPercent": 2
    },
    "trendFilter": {
     "method": "price_change",
     "lookbackSessions": 30,
     "minimumReturnPercent": -2
    },
    "eligibility": {
     "policy": "time_limited",
     "maxAgeSessions": 20
    },
    "initialStop": {
     "atrSessions": 20,
     "atrMultiple": 2
    },
    "drawdownGate": {
     "lookbackSessions": 60,
     "dipThresholdPercent": 10,
     "recoveryRetracementPercent": 49,
     "confirmationSessions": 2
    }
   }
  },
  "VGT": {
   "enabled": true,
   "identity": "420cd989e4fa7749",
   "effective": {
    "entryMethod": "rise_from_recent_low",
    "advanceFromRecentLowPercent": 5,
    "recentLowLookbackBars": 90,
    "trendFilterEnabled": true,
    "trendMethod": "price_change",
    "trendChangeLookbackSessions": 30,
    "trendChangeMinimumReturnPercent": -2,
    "eligibilityEnabled": true,
    "eligibilityPolicy": "time_limited",
    "eligibilityMaxAgeSessions": 20,
    "drawdownRecoveryGateEnabled": true,
    "dipLookbackSessions": 60,
    "dipThresholdPercent": 10,
    "recoveryRetracementPercent": 45,
    "recoveryConfirmationSessions": 2,
    "trailingStopPercent": 6,
    "maximumHoldEnabled": true,
    "maximumHoldDays": 21,
    "intradayLossBufferEnabled": true,
    "intradayLossBufferPercent": 2.9,
    "initialStopEnabled": true,
    "initialStopAtrSessions": 20,
    "initialStopAtrMultiple": 1.5,
    "retentionEnabled": false,
    "continuationEnabled": true,
    "continuationMethod": "shallow_pullback",
    "continuationWindowSessions": 60,
    "uptrendSmaBars": 50,
    "uptrendSlopeBars": 10,
    "uptrendMinimumRisePercent": 0,
    "pullbackMinimumPercent": 1.5,
    "pullbackMaximumPercent": 8,
    "recoveryPercent": 1,
    "costBpsPerSide": 5
   },
   "engineParams": {
    "advanceFromRecentLowPercent": 5,
    "recentLowLookbackBars": 90,
    "resolution": "1d",
    "trailingStopPercent": 6,
    "maximumHoldEnabled": true,
    "maximumHoldDays": 21,
    "intradayLossBufferEnabled": true,
    "intradayLossBufferPercent": 2.9,
    "costBpsPerSide": 5,
    "continuation": {
     "method": "shallow_pullback",
     "windowSessions": 60,
     "smaBars": 50,
     "slopeBars": 10,
     "minimumRisePercent": 0,
     "pullbackMinimumPercent": 1.5,
     "pullbackMaximumPercent": 8,
     "recoveryPercent": 1
    },
    "trendFilter": {
     "method": "price_change",
     "lookbackSessions": 30,
     "minimumReturnPercent": -2
    },
    "eligibility": {
     "policy": "time_limited",
     "maxAgeSessions": 20
    },
    "initialStop": {
     "atrSessions": 20,
     "atrMultiple": 1.5
    },
    "drawdownGate": {
     "lookbackSessions": 60,
     "dipThresholdPercent": 10,
     "recoveryRetracementPercent": 45,
     "confirmationSessions": 2
    }
   }
  }
 },
 "allocator": {
  "lifecycle": "L0 (current virtual-book model: a refused entry keeps its virtual trade; funding never feeds back)",
  "architecture": "A: one exclusive funded slot",
  "principalBudget": 100000,
  "compounding": false,
  "preemption": false,
  "simultaneousFundedPositions": false,
  "partialExitReleasesSlot": false,
  "sameInstantOrder": [
   "D1:GDX",
   "D1:VGT",
   "G:GDX",
   "G:VGT"
  ],
  "costBpsPerSide": 5,
  "commission": 0,
  "interest": "11% simple annual on outstanding principal, calendar days / 365",
  "stopFill": "at the stop or the gapped open; no extra slippage",
  "shares": "fractional",
  "fundingFrom": "2016-01-04",
  "d1Arming": "harmonized: from the first session (each D1 machine arms once its reference high exists)",
  "d1DelayedEligibility": false
 }
}
```

## B

```json
{
 "id": "b661a930ae9dd7f3",
 "priority3QuadId": "676731bfd4ec280f",
 "inclusion": "B",
 "enabled": [
  "D1:GDX",
  "D1:VGT",
  "G:GDX",
  "G:VGT"
 ],
 "d1": {
  "GDX": {
   "grid": {
    "targetPercentChange": 276,
    "trailingBuyPercentage": 1,
    "trailingStopPercentage": 57,
    "maximumHoldDays": 12,
    "tickWindowSize": 243,
    "intradayLossBuffer": 29,
    "pullback": 152,
    "continuationWindow": 12
   },
   "unit": "tenths of a percentage point / days / sessions",
   "strategyParams": {
    "key": "d1",
    "label": "GDX d1-276,1,57,12,243,29,152,12",
    "entryMode": "deep",
    "postExit": true,
    "stopPolicy": "net",
    "targetPercentChange": 0.276,
    "tickWindowSize": 243,
    "trailingBuyPercentage": 0.001,
    "trailingStopPercentage": 0.057,
    "maximumHoldDays": 12,
    "intradayLossBuffer": 0.029,
    "pullback": 0.152,
    "continuationWindow": 12,
    "swingLookback": "__NaN",
    "swingProximity": "__NaN"
   }
  },
  "VGT": {
   "grid": {
    "targetPercentChange": 235,
    "trailingBuyPercentage": 9,
    "trailingStopPercentage": 74,
    "maximumHoldDays": 15,
    "tickWindowSize": 78,
    "intradayLossBuffer": 44,
    "pullback": 110,
    "continuationWindow": 55
   },
   "unit": "tenths of a percentage point / days / sessions",
   "strategyParams": {
    "key": "d1",
    "label": "VGT d1-235,9,74,15,78,44,110,55",
    "entryMode": "deep",
    "postExit": true,
    "stopPolicy": "net",
    "targetPercentChange": 0.235,
    "tickWindowSize": 78,
    "trailingBuyPercentage": 0.009,
    "trailingStopPercentage": 0.074,
    "maximumHoldDays": 15,
    "intradayLossBuffer": 0.044,
    "pullback": 0.11,
    "continuationWindow": 55,
    "swingLookback": "__NaN",
    "swingProximity": "__NaN"
   }
  }
 },
 "growth": {
  "GDX": {
   "enabled": true,
   "identity": "07cac3329fc7a520",
   "effective": {
    "entryMethod": "rise_from_recent_low",
    "advanceFromRecentLowPercent": 3,
    "recentLowLookbackBars": 22,
    "trendFilterEnabled": true,
    "trendMethod": "price_change",
    "trendChangeLookbackSessions": 30,
    "trendChangeMinimumReturnPercent": -2,
    "eligibilityEnabled": true,
    "eligibilityPolicy": "time_limited",
    "eligibilityMaxAgeSessions": 20,
    "drawdownRecoveryGateEnabled": true,
    "dipLookbackSessions": 60,
    "dipThresholdPercent": 10,
    "recoveryRetracementPercent": 49,
    "recoveryConfirmationSessions": 2,
    "trailingStopPercent": 7,
    "maximumHoldEnabled": false,
    "initialStopEnabled": true,
    "initialStopAtrSessions": 20,
    "initialStopAtrMultiple": 2,
    "retentionEnabled": false,
    "continuationEnabled": true,
    "continuationMethod": "shallow_pullback",
    "continuationWindowSessions": 60,
    "uptrendSmaBars": 50,
    "uptrendSlopeBars": 10,
    "uptrendMinimumRisePercent": 0,
    "pullbackMinimumPercent": 1.5,
    "pullbackMaximumPercent": 8,
    "recoveryPercent": 2,
    "costBpsPerSide": 5
   },
   "engineParams": {
    "advanceFromRecentLowPercent": 3,
    "recentLowLookbackBars": 22,
    "resolution": "1d",
    "trailingStopPercent": 7,
    "maximumHoldEnabled": false,
    "maximumHoldDays": "__NaN",
    "intradayLossBufferEnabled": false,
    "intradayLossBufferPercent": "__NaN",
    "costBpsPerSide": 5,
    "continuation": {
     "method": "shallow_pullback",
     "windowSessions": 60,
     "smaBars": 50,
     "slopeBars": 10,
     "minimumRisePercent": 0,
     "pullbackMinimumPercent": 1.5,
     "pullbackMaximumPercent": 8,
     "recoveryPercent": 2
    },
    "trendFilter": {
     "method": "price_change",
     "lookbackSessions": 30,
     "minimumReturnPercent": -2
    },
    "eligibility": {
     "policy": "time_limited",
     "maxAgeSessions": 20
    },
    "initialStop": {
     "atrSessions": 20,
     "atrMultiple": 2
    },
    "drawdownGate": {
     "lookbackSessions": 60,
     "dipThresholdPercent": 10,
     "recoveryRetracementPercent": 49,
     "confirmationSessions": 2
    }
   }
  },
  "VGT": {
   "enabled": true,
   "identity": "08500a60ec56cfae",
   "effective": {
    "entryMethod": "rise_from_recent_low",
    "advanceFromRecentLowPercent": 1,
    "recentLowLookbackBars": 80,
    "trendFilterEnabled": true,
    "trendMethod": "price_change",
    "trendChangeLookbackSessions": 10,
    "trendChangeMinimumReturnPercent": -5,
    "eligibilityEnabled": true,
    "eligibilityPolicy": "reset_renew",
    "eligibilityMaxAgeSessions": 24,
    "eligibilityResetDropPercent": 5.5,
    "eligibilityRenewalReboundPercent": 5,
    "drawdownRecoveryGateEnabled": true,
    "dipLookbackSessions": 90,
    "dipThresholdPercent": 2,
    "recoveryRetracementPercent": 30,
    "recoveryConfirmationSessions": 4,
    "trailingStopPercent": 9,
    "maximumHoldEnabled": false,
    "initialStopEnabled": true,
    "initialStopAtrSessions": 55,
    "initialStopAtrMultiple": 1,
    "retentionEnabled": true,
    "retentionSellPercent": 50,
    "retentionSmaSessions": 160,
    "retentionClosesBelow": 1,
    "continuationEnabled": true,
    "continuationMethod": "ma_cross",
    "continuationWindowSessions": 50,
    "crossSmaBars": 110,
    "crossRisingBars": 19,
    "crossMinimumSlopePercent": 0.4,
    "crossMarginPercent": 2.75,
    "costBpsPerSide": 5
   },
   "engineParams": {
    "advanceFromRecentLowPercent": 1,
    "recentLowLookbackBars": 80,
    "resolution": "1d",
    "trailingStopPercent": 9,
    "maximumHoldEnabled": false,
    "maximumHoldDays": "__NaN",
    "intradayLossBufferEnabled": false,
    "intradayLossBufferPercent": "__NaN",
    "costBpsPerSide": 5,
    "continuation": {
     "method": "ma_cross",
     "windowSessions": 50,
     "smaBars": 110,
     "risingBars": 19,
     "minimumSlopePercent": 0.4,
     "marginPercent": 2.75
    },
    "trendFilter": {
     "method": "price_change",
     "lookbackSessions": 10,
     "minimumReturnPercent": -5
    },
    "eligibility": {
     "policy": "reset_renew",
     "maxAgeSessions": 24,
     "resetDropPercent": 5.5,
     "renewalReboundPercent": 5
    },
    "initialStop": {
     "atrSessions": 55,
     "atrMultiple": 1
    },
    "retention": {
     "sellPercent": 50,
     "smaSessions": 160,
     "closesBelow": 1
    },
    "drawdownGate": {
     "lookbackSessions": 90,
     "dipThresholdPercent": 2,
     "recoveryRetracementPercent": 30,
     "confirmationSessions": 4
    }
   }
  }
 },
 "allocator": {
  "lifecycle": "L0 (current virtual-book model: a refused entry keeps its virtual trade; funding never feeds back)",
  "architecture": "A: one exclusive funded slot",
  "principalBudget": 100000,
  "compounding": false,
  "preemption": false,
  "simultaneousFundedPositions": false,
  "partialExitReleasesSlot": false,
  "sameInstantOrder": [
   "D1:GDX",
   "D1:VGT",
   "G:GDX",
   "G:VGT"
  ],
  "costBpsPerSide": 5,
  "commission": 0,
  "interest": "11% simple annual on outstanding principal, calendar days / 365",
  "stopFill": "at the stop or the gapped open; no extra slippage",
  "shares": "fractional",
  "fundingFrom": "2016-01-04",
  "d1Arming": "harmonized: from the first session (each D1 machine arms once its reference high exists)",
  "d1DelayedEligibility": false
 }
}
```

## C85

```json
{
 "id": "38be30d42d55ec7f",
 "priority3QuadId": "3688e97b90639d60",
 "inclusion": "V",
 "enabled": [
  "D1:GDX",
  "D1:VGT",
  "G:VGT"
 ],
 "d1": {
  "GDX": {
   "grid": {
    "targetPercentChange": 276,
    "trailingBuyPercentage": 1,
    "trailingStopPercentage": 57,
    "maximumHoldDays": 12,
    "tickWindowSize": 243,
    "intradayLossBuffer": 29,
    "pullback": 152,
    "continuationWindow": 12
   },
   "unit": "tenths of a percentage point / days / sessions",
   "strategyParams": {
    "key": "d1",
    "label": "GDX d1-276,1,57,12,243,29,152,12",
    "entryMode": "deep",
    "postExit": true,
    "stopPolicy": "net",
    "targetPercentChange": 0.276,
    "tickWindowSize": 243,
    "trailingBuyPercentage": 0.001,
    "trailingStopPercentage": 0.057,
    "maximumHoldDays": 12,
    "intradayLossBuffer": 0.029,
    "pullback": 0.152,
    "continuationWindow": 12,
    "swingLookback": "__NaN",
    "swingProximity": "__NaN"
   }
  },
  "VGT": {
   "grid": {
    "targetPercentChange": 235,
    "trailingBuyPercentage": 9,
    "trailingStopPercentage": 74,
    "maximumHoldDays": 15,
    "tickWindowSize": 78,
    "intradayLossBuffer": 44,
    "pullback": 110,
    "continuationWindow": 55
   },
   "unit": "tenths of a percentage point / days / sessions",
   "strategyParams": {
    "key": "d1",
    "label": "VGT d1-235,9,74,15,78,44,110,55",
    "entryMode": "deep",
    "postExit": true,
    "stopPolicy": "net",
    "targetPercentChange": 0.235,
    "tickWindowSize": 78,
    "trailingBuyPercentage": 0.009,
    "trailingStopPercentage": 0.074,
    "maximumHoldDays": 15,
    "intradayLossBuffer": 0.044,
    "pullback": 0.11,
    "continuationWindow": 55,
    "swingLookback": "__NaN",
    "swingProximity": "__NaN"
   }
  }
 },
 "growth": {
  "GDX": {
   "enabled": false,
   "placeholderIdentity": "1af5b55987a56e2f",
   "note": "disabled: never run or funded (placeholder vector)"
  },
  "VGT": {
   "enabled": true,
   "identity": "08500a60ec56cfae",
   "effective": {
    "entryMethod": "rise_from_recent_low",
    "advanceFromRecentLowPercent": 1,
    "recentLowLookbackBars": 80,
    "trendFilterEnabled": true,
    "trendMethod": "price_change",
    "trendChangeLookbackSessions": 10,
    "trendChangeMinimumReturnPercent": -5,
    "eligibilityEnabled": true,
    "eligibilityPolicy": "reset_renew",
    "eligibilityMaxAgeSessions": 24,
    "eligibilityResetDropPercent": 5.5,
    "eligibilityRenewalReboundPercent": 5,
    "drawdownRecoveryGateEnabled": true,
    "dipLookbackSessions": 90,
    "dipThresholdPercent": 2,
    "recoveryRetracementPercent": 30,
    "recoveryConfirmationSessions": 4,
    "trailingStopPercent": 9,
    "maximumHoldEnabled": false,
    "initialStopEnabled": true,
    "initialStopAtrSessions": 55,
    "initialStopAtrMultiple": 1,
    "retentionEnabled": true,
    "retentionSellPercent": 50,
    "retentionSmaSessions": 160,
    "retentionClosesBelow": 1,
    "continuationEnabled": true,
    "continuationMethod": "ma_cross",
    "continuationWindowSessions": 50,
    "crossSmaBars": 110,
    "crossRisingBars": 19,
    "crossMinimumSlopePercent": 0.4,
    "crossMarginPercent": 2.75,
    "costBpsPerSide": 5
   },
   "engineParams": {
    "advanceFromRecentLowPercent": 1,
    "recentLowLookbackBars": 80,
    "resolution": "1d",
    "trailingStopPercent": 9,
    "maximumHoldEnabled": false,
    "maximumHoldDays": "__NaN",
    "intradayLossBufferEnabled": false,
    "intradayLossBufferPercent": "__NaN",
    "costBpsPerSide": 5,
    "continuation": {
     "method": "ma_cross",
     "windowSessions": 50,
     "smaBars": 110,
     "risingBars": 19,
     "minimumSlopePercent": 0.4,
     "marginPercent": 2.75
    },
    "trendFilter": {
     "method": "price_change",
     "lookbackSessions": 10,
     "minimumReturnPercent": -5
    },
    "eligibility": {
     "policy": "reset_renew",
     "maxAgeSessions": 24,
     "resetDropPercent": 5.5,
     "renewalReboundPercent": 5
    },
    "initialStop": {
     "atrSessions": 55,
     "atrMultiple": 1
    },
    "retention": {
     "sellPercent": 50,
     "smaSessions": 160,
     "closesBelow": 1
    },
    "drawdownGate": {
     "lookbackSessions": 90,
     "dipThresholdPercent": 2,
     "recoveryRetracementPercent": 30,
     "confirmationSessions": 4
    }
   }
  }
 },
 "allocator": {
  "lifecycle": "L0 (current virtual-book model: a refused entry keeps its virtual trade; funding never feeds back)",
  "architecture": "A: one exclusive funded slot",
  "principalBudget": 100000,
  "compounding": false,
  "preemption": false,
  "simultaneousFundedPositions": false,
  "partialExitReleasesSlot": false,
  "sameInstantOrder": [
   "D1:GDX",
   "D1:VGT",
   "G:GDX",
   "G:VGT"
  ],
  "costBpsPerSide": 5,
  "commission": 0,
  "interest": "11% simple annual on outstanding principal, calendar days / 365",
  "stopFill": "at the stop or the gapped open; no extra slippage",
  "shares": "fractional",
  "fundingFrom": "2016-01-04",
  "d1Arming": "harmonized: from the first session (each D1 machine arms once its reference high exists)",
  "d1DelayedEligibility": false
 }
}
```

## D (D: VG #2 D1 only)

```json
{
 "quad": {
  "d1": {
   "GDX": {
    "targetPercentChange": 276,
    "trailingBuyPercentage": 1,
    "trailingStopPercentage": 57,
    "maximumHoldDays": 12,
    "tickWindowSize": 243,
    "intradayLossBuffer": 29,
    "pullback": 152,
    "continuationWindow": 12
   },
   "VGT": {
    "targetPercentChange": 235,
    "trailingBuyPercentage": 9,
    "trailingStopPercentage": 74,
    "maximumHoldDays": 15,
    "tickWindowSize": 78,
    "intradayLossBuffer": 44,
    "pullback": 110,
    "continuationWindow": 55
   }
  },
  "g": {
   "GDX": {
    "entryMethod": "rise_from_recent_low",
    "advanceFromRecentLowPercent": 5,
    "recentLowLookbackBars": 20,
    "trendFilterEnabled": false,
    "eligibilityEnabled": false,
    "drawdownRecoveryGateEnabled": false,
    "trailingStopPercent": 7.3,
    "maximumHoldEnabled": true,
    "maximumHoldDays": 8,
    "intradayLossBufferEnabled": true,
    "intradayLossBufferPercent": 2.9,
    "initialStopEnabled": false,
    "retentionEnabled": false,
    "continuationEnabled": false,
    "costBpsPerSide": 5
   },
   "VGT": {
    "entryMethod": "rise_from_recent_low",
    "advanceFromRecentLowPercent": 5,
    "recentLowLookbackBars": 20,
    "trendFilterEnabled": false,
    "eligibilityEnabled": false,
    "drawdownRecoveryGateEnabled": false,
    "trailingStopPercent": 7.3,
    "maximumHoldEnabled": true,
    "maximumHoldDays": 8,
    "intradayLossBufferEnabled": true,
    "intradayLossBufferPercent": 2.9,
    "initialStopEnabled": false,
    "retentionEnabled": false,
    "continuationEnabled": false,
    "costBpsPerSide": 5
   }
  },
  "first": "D1"
 },
 "options": {
  "enabled": {
   "G:GDX": false,
   "G:VGT": false
  }
 },
 "allocator": {
  "lifecycle": "L0 (current virtual-book model: a refused entry keeps its virtual trade; funding never feeds back)",
  "architecture": "A: one exclusive funded slot",
  "principalBudget": 100000,
  "compounding": false,
  "preemption": false,
  "simultaneousFundedPositions": false,
  "partialExitReleasesSlot": false,
  "sameInstantOrder": [
   "D1:GDX",
   "D1:VGT",
   "G:GDX",
   "G:VGT"
  ],
  "costBpsPerSide": 5,
  "commission": 0,
  "interest": "11% simple annual on outstanding principal, calendar days / 365",
  "stopFill": "at the stop or the gapped open; no extra slippage",
  "shares": "fractional",
  "fundingFrom": "2016-01-04",
  "d1Arming": "harmonized: from the first session (each D1 machine arms once its reference high exists)",
  "d1DelayedEligibility": false
 }
}
```

## V4 (VGT only: shipped D1 primary + Growth #4 (Priority 2))

```json
{
 "quad": {
  "d1": {
   "GDX": {
    "targetPercentChange": 80,
    "trailingBuyPercentage": 1,
    "trailingStopPercentage": 30,
    "maximumHoldDays": 3,
    "tickWindowSize": 20,
    "intradayLossBuffer": 0,
    "pullback": 30,
    "continuationWindow": 10
   },
   "VGT": {
    "targetPercentChange": 216,
    "trailingBuyPercentage": 3,
    "trailingStopPercentage": 73,
    "maximumHoldDays": 8,
    "tickWindowSize": 74,
    "intradayLossBuffer": 29,
    "pullback": 90,
    "continuationWindow": 60
   }
  },
  "g": {
   "GDX": {
    "entryMethod": "rise_from_recent_low",
    "advanceFromRecentLowPercent": 5,
    "recentLowLookbackBars": 20,
    "trendFilterEnabled": false,
    "eligibilityEnabled": false,
    "drawdownRecoveryGateEnabled": false,
    "trailingStopPercent": 7.3,
    "maximumHoldEnabled": true,
    "maximumHoldDays": 8,
    "intradayLossBufferEnabled": true,
    "intradayLossBufferPercent": 2.9,
    "initialStopEnabled": false,
    "retentionEnabled": false,
    "continuationEnabled": false,
    "costBpsPerSide": 5
   },
   "VGT": {
    "entryMethod": "rise_from_recent_low",
    "advanceFromRecentLowPercent": 5,
    "recentLowLookbackBars": 90,
    "trendFilterEnabled": true,
    "trendMethod": "price_change",
    "trendChangeLookbackSessions": 30,
    "trendChangeMinimumReturnPercent": -2,
    "eligibilityEnabled": true,
    "eligibilityPolicy": "time_limited",
    "eligibilityMaxAgeSessions": 20,
    "drawdownRecoveryGateEnabled": true,
    "dipLookbackSessions": 60,
    "dipThresholdPercent": 10,
    "recoveryRetracementPercent": 45,
    "recoveryConfirmationSessions": 2,
    "trailingStopPercent": 6,
    "maximumHoldEnabled": true,
    "maximumHoldDays": 21,
    "intradayLossBufferEnabled": true,
    "intradayLossBufferPercent": 2.9,
    "initialStopEnabled": true,
    "initialStopAtrSessions": 20,
    "initialStopAtrMultiple": 1.5,
    "retentionEnabled": false,
    "continuationEnabled": true,
    "continuationMethod": "shallow_pullback",
    "continuationWindowSessions": 60,
    "uptrendSmaBars": 50,
    "uptrendSlopeBars": 10,
    "uptrendMinimumRisePercent": 0,
    "pullbackMinimumPercent": 1.5,
    "pullbackMaximumPercent": 8,
    "recoveryPercent": 1,
    "costBpsPerSide": 5
   }
  },
  "first": "D1"
 },
 "options": {
  "enabled": {
   "D1:GDX": false,
   "G:GDX": false
  }
 },
 "allocator": {
  "lifecycle": "L0 (current virtual-book model: a refused entry keeps its virtual trade; funding never feeds back)",
  "architecture": "A: one exclusive funded slot",
  "principalBudget": 100000,
  "compounding": false,
  "preemption": false,
  "simultaneousFundedPositions": false,
  "partialExitReleasesSlot": false,
  "sameInstantOrder": [
   "D1:GDX",
   "D1:VGT",
   "G:GDX",
   "G:VGT"
  ],
  "costBpsPerSide": 5,
  "commission": 0,
  "interest": "11% simple annual on outstanding principal, calendar days / 365",
  "stopFill": "at the stop or the gapped open; no extra slippage",
  "shares": "fractional",
  "fundingFrom": "2016-01-04",
  "d1Arming": "harmonized: from the first session (each D1 machine arms once its reference high exists)",
  "d1DelayedEligibility": false
 }
}
```

## V85 (VGT only: shipped D1 primary + Growth 08500a60 (Priority 2))

```json
{
 "quad": {
  "d1": {
   "GDX": {
    "targetPercentChange": 80,
    "trailingBuyPercentage": 1,
    "trailingStopPercentage": 30,
    "maximumHoldDays": 3,
    "tickWindowSize": 20,
    "intradayLossBuffer": 0,
    "pullback": 30,
    "continuationWindow": 10
   },
   "VGT": {
    "targetPercentChange": 216,
    "trailingBuyPercentage": 3,
    "trailingStopPercentage": 73,
    "maximumHoldDays": 8,
    "tickWindowSize": 74,
    "intradayLossBuffer": 29,
    "pullback": 90,
    "continuationWindow": 60
   }
  },
  "g": {
   "GDX": {
    "entryMethod": "rise_from_recent_low",
    "advanceFromRecentLowPercent": 5,
    "recentLowLookbackBars": 20,
    "trendFilterEnabled": false,
    "eligibilityEnabled": false,
    "drawdownRecoveryGateEnabled": false,
    "trailingStopPercent": 7.3,
    "maximumHoldEnabled": true,
    "maximumHoldDays": 8,
    "intradayLossBufferEnabled": true,
    "intradayLossBufferPercent": 2.9,
    "initialStopEnabled": false,
    "retentionEnabled": false,
    "continuationEnabled": false,
    "costBpsPerSide": 5
   },
   "VGT": {
    "entryMethod": "rise_from_recent_low",
    "advanceFromRecentLowPercent": 1,
    "recentLowLookbackBars": 80,
    "trendFilterEnabled": true,
    "trendMethod": "price_change",
    "trendChangeLookbackSessions": 10,
    "trendChangeMinimumReturnPercent": -5,
    "eligibilityEnabled": true,
    "eligibilityPolicy": "reset_renew",
    "eligibilityMaxAgeSessions": 24,
    "eligibilityResetDropPercent": 5.5,
    "eligibilityRenewalReboundPercent": 5,
    "drawdownRecoveryGateEnabled": true,
    "dipLookbackSessions": 90,
    "dipThresholdPercent": 2,
    "recoveryRetracementPercent": 30,
    "recoveryConfirmationSessions": 4,
    "trailingStopPercent": 9,
    "maximumHoldEnabled": false,
    "initialStopEnabled": true,
    "initialStopAtrSessions": 55,
    "initialStopAtrMultiple": 1,
    "retentionEnabled": true,
    "retentionSellPercent": 50,
    "retentionSmaSessions": 160,
    "retentionClosesBelow": 1,
    "continuationEnabled": true,
    "continuationMethod": "ma_cross",
    "continuationWindowSessions": 50,
    "crossSmaBars": 110,
    "crossRisingBars": 19,
    "crossMinimumSlopePercent": 0.4,
    "crossMarginPercent": 2.75,
    "costBpsPerSide": 5
   }
  },
  "first": "D1"
 },
 "options": {
  "enabled": {
   "D1:GDX": false,
   "G:GDX": false
  }
 },
 "allocator": {
  "lifecycle": "L0 (current virtual-book model: a refused entry keeps its virtual trade; funding never feeds back)",
  "architecture": "A: one exclusive funded slot",
  "principalBudget": 100000,
  "compounding": false,
  "preemption": false,
  "simultaneousFundedPositions": false,
  "partialExitReleasesSlot": false,
  "sameInstantOrder": [
   "D1:GDX",
   "D1:VGT",
   "G:GDX",
   "G:VGT"
  ],
  "costBpsPerSide": 5,
  "commission": 0,
  "interest": "11% simple annual on outstanding principal, calendar days / 365",
  "stopFill": "at the stop or the gapped open; no extra slippage",
  "shares": "fractional",
  "fundingFrom": "2016-01-04",
  "d1Arming": "harmonized: from the first session (each D1 machine arms once its reference high exists)",
  "d1DelayedEligibility": false
 }
}
```
