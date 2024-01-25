/* eslint-disable prefer-const */
import { BigDecimal, BigInt, ethereum, store } from '@graphprotocol/graph-ts'
import { Bundle, Pair, PairDayData, Token, TokenDayData, TokenHourData, TokenMinuteData, UniswapDayData, UniswapFactory } from '../types/schema'
import { PairHourData } from './../types/schema'
import { FACTORY_ADDRESS, ONE_BI, ZERO_BD, ZERO_BI } from './helpers'

export function updateUniswapDayData(event: ethereum.Event): UniswapDayData {
  let uniswap = UniswapFactory.load(FACTORY_ADDRESS)!
  let timestamp = event.block.timestamp.toI32()
  let dayID = timestamp / 86400
  let dayStartTimestamp = dayID * 86400
  let uniswapDayData = UniswapDayData.load(dayID.toString())
  if (uniswapDayData === null) {
    uniswapDayData = new UniswapDayData(dayID.toString())
    uniswapDayData.date = dayStartTimestamp
    uniswapDayData.dailyVolumeUSD = ZERO_BD
    uniswapDayData.dailyVolumeETH = ZERO_BD
    uniswapDayData.totalVolumeUSD = ZERO_BD
    uniswapDayData.totalVolumeETH = ZERO_BD
    uniswapDayData.dailyVolumeUntracked = ZERO_BD
  }

  uniswapDayData.totalLiquidityUSD = uniswap.totalLiquidityUSD
  uniswapDayData.totalLiquidityETH = uniswap.totalLiquidityETH
  uniswapDayData.txCount = uniswap.txCount
  uniswapDayData.save()

  return uniswapDayData as UniswapDayData
}

export function updatePairDayData(event: ethereum.Event): PairDayData {
  let timestamp = event.block.timestamp.toI32()
  let dayID = timestamp / 86400
  let dayStartTimestamp = dayID * 86400
  let dayPairID = event.address
    .toHexString()
    .concat('-')
    .concat(BigInt.fromI32(dayID).toString())
  let pair = Pair.load(event.address.toHexString())!
  let pairDayData = PairDayData.load(dayPairID)
  if (pairDayData === null) {
    pairDayData = new PairDayData(dayPairID)
    pairDayData.date = dayStartTimestamp
    pairDayData.token0 = pair.token0
    pairDayData.token1 = pair.token1
    pairDayData.pairAddress = event.address
    pairDayData.dailyVolumeToken0 = ZERO_BD
    pairDayData.dailyVolumeToken1 = ZERO_BD
    pairDayData.dailyVolumeUSD = ZERO_BD
    pairDayData.dailyTxns = ZERO_BI
  }

  pairDayData.totalSupply = pair.totalSupply
  pairDayData.reserve0 = pair.reserve0
  pairDayData.reserve1 = pair.reserve1
  pairDayData.reserveUSD = pair.reserveUSD
  pairDayData.dailyTxns = pairDayData.dailyTxns.plus(ONE_BI)
  pairDayData.save()

  return pairDayData as PairDayData
}

export function updatePairHourData(event: ethereum.Event): PairHourData {
  let timestamp = event.block.timestamp.toI32()
  let hourIndex = timestamp / 3600 // get unique hour within unix history
  let hourStartUnix = hourIndex * 3600 // want the rounded effect
  let hourPairID = event.address
    .toHexString()
    .concat('-')
    .concat(BigInt.fromI32(hourIndex).toString())
  let pair = Pair.load(event.address.toHexString())!
  let pairHourData = PairHourData.load(hourPairID)
  if (pairHourData === null) {
    pairHourData = new PairHourData(hourPairID)
    pairHourData.hourStartUnix = hourStartUnix
    pairHourData.pair = event.address.toHexString()
    pairHourData.hourlyVolumeToken0 = ZERO_BD
    pairHourData.hourlyVolumeToken1 = ZERO_BD
    pairHourData.hourlyVolumeUSD = ZERO_BD
    pairHourData.hourlyTxns = ZERO_BI
  }

  pairHourData.totalSupply = pair.totalSupply
  pairHourData.reserve0 = pair.reserve0
  pairHourData.reserve1 = pair.reserve1
  pairHourData.reserveUSD = pair.reserveUSD
  pairHourData.hourlyTxns = pairHourData.hourlyTxns.plus(ONE_BI)
  pairHourData.save()

  return pairHourData as PairHourData
}

export function updateTokenDayData(token: Token, event: ethereum.Event): TokenDayData {
  let bundle = Bundle.load('1')!
  let timestamp = event.block.timestamp.toI32()
  let dayID = timestamp / 86400
  let dayStartTimestamp = dayID * 86400
  let tokenDayID = token.id
    .toString()
    .concat('-')
    .concat(BigInt.fromI32(dayID).toString())

  let tokenDayData = TokenDayData.load(tokenDayID)
  if (tokenDayData === null) {
    tokenDayData = new TokenDayData(tokenDayID)
    tokenDayData.date = dayStartTimestamp
    tokenDayData.token = token.id
    tokenDayData.priceUSD = token.derivedETH.times(bundle.ethPrice)
    tokenDayData.dailyVolumeToken = ZERO_BD
    tokenDayData.dailyVolumeETH = ZERO_BD
    tokenDayData.dailyVolumeUSD = ZERO_BD
    tokenDayData.dailyTxns = ZERO_BI
    tokenDayData.totalLiquidityUSD = ZERO_BD
  }
  tokenDayData.priceUSD = token.derivedETH.times(bundle.ethPrice)
  tokenDayData.totalLiquidityToken = token.totalLiquidity
  tokenDayData.totalLiquidityETH = token.totalLiquidity.times(token.derivedETH as BigDecimal)
  tokenDayData.totalLiquidityUSD = tokenDayData.totalLiquidityETH.times(bundle.ethPrice)
  tokenDayData.dailyTxns = tokenDayData.dailyTxns.plus(ONE_BI)
  tokenDayData.save()

  /**
   * @todo test if this speeds up sync
   */
  // updateStoredTokens(tokenDayData as TokenDayData, dayID)
  // updateStoredPairs(tokenDayData as TokenDayData, dayPairID)

  return tokenDayData as TokenDayData
}


export function updateTokenHourData(token: Token, event: ethereum.Event): TokenHourData {
  let bundle = Bundle.load('1')!
  let timestamp = event.block.timestamp.toI32()
  let hourIndex = timestamp / 3600 // get unique hour within unix history
  let hourStartUnix = hourIndex * 3600 // want the rounded effect
  let tokenHourID = token.id
    .concat('-')
    .concat(hourIndex.toString())
  let tokenHourData = TokenHourData.load(tokenHourID)
  let tokenPrice = token.derivedETH.times(bundle.ethPrice)
  let isNew = false
  if (!tokenHourData) {
    tokenHourData = new TokenHourData(tokenHourID)
    tokenHourData.periodStartUnix = hourStartUnix
    tokenHourData.token = token.id
    tokenHourData.volume = ZERO_BD
    tokenHourData.volumeUSD = ZERO_BD
    tokenHourData.untrackedVolumeUSD = ZERO_BD
    tokenHourData.feesUSD = ZERO_BD
    tokenHourData.open = tokenPrice
    tokenHourData.high = tokenPrice
    tokenHourData.low = tokenPrice
    tokenHourData.close = tokenPrice
    let tokenHourArray = token.hourArray
    tokenHourArray.push(hourIndex)
    token.hourArray = tokenHourArray
    token.save()
    isNew = true
  }

  if (tokenPrice.gt(tokenHourData.high)) {
    tokenHourData.high = tokenPrice
  }

  if (tokenPrice.lt(tokenHourData.low)) {
    tokenHourData.low = tokenPrice
  }

  tokenHourData.close = tokenPrice
  tokenHourData.priceUSD = tokenPrice
  tokenHourData.totalValueLocked = BigDecimal.fromString("0")
  tokenHourData.totalValueLockedUSD = BigDecimal.fromString("0")
  tokenHourData.save()

  if (token.lastHourArchived.equals(ZERO_BI) && token.lastHourRecorded.equals(ZERO_BI)) {
    token.lastHourRecorded = BigInt.fromI32(hourIndex)
    token.lastHourArchived = BigInt.fromI32(hourIndex-1)
  }

  if (isNew) {
    let lastHourArchived = token.lastHourArchived.toI32()
    let stop = hourIndex - 768
    if (stop > lastHourArchived) {
      archiveHourData(token,stop) //cur
    }
    token.lastHourRecorded = BigInt.fromI32(hourIndex)
    token.save()
  }

  return tokenHourData as TokenHourData
}

export function updateTokenMinuteData(token: Token, event: ethereum.Event): TokenMinuteData {
  let bundle = Bundle.load('1')!
  let timestamp = event.block.timestamp.toI32()
  let minuteIndex = timestamp / 60 // get unique hour within unix history
  let minuteStartUnix = minuteIndex * 60 // want the rounded effect
  let tokenMinuteID = token.id
    .concat('-')
    .concat(minuteIndex.toString())
  let tokenMinuteData = TokenMinuteData.load(tokenMinuteID)
  let tokenPrice = token.derivedETH.times(bundle.ethPrice)
  let isNew = false
  if (!tokenMinuteData) {
    tokenMinuteData = new TokenMinuteData(tokenMinuteID)
    tokenMinuteData.periodStartUnix = minuteStartUnix
    tokenMinuteData.token = token.id
    tokenMinuteData.volume = ZERO_BD
    tokenMinuteData.volumeUSD = ZERO_BD
    tokenMinuteData.untrackedVolumeUSD = ZERO_BD
    tokenMinuteData.feesUSD = ZERO_BD
    tokenMinuteData.open = tokenPrice
    tokenMinuteData.high = tokenPrice
    tokenMinuteData.low = tokenPrice
    tokenMinuteData.close = tokenPrice
    let tokenMinuteArray = token.minuteArray
    tokenMinuteArray.push(minuteIndex)
    token.minuteArray = tokenMinuteArray
    token.save()
    isNew = true
  }

  if (tokenPrice.gt(tokenMinuteData.high)) {
    tokenMinuteData.high = tokenPrice
  }

  if (tokenPrice.lt(tokenMinuteData.low)) {
    tokenMinuteData.low = tokenPrice
  }

  tokenMinuteData.close = tokenPrice
  tokenMinuteData.priceUSD = tokenPrice
  tokenMinuteData.totalValueLocked = BigDecimal.fromString("0")
  tokenMinuteData.totalValueLockedUSD = BigDecimal.fromString("0")
  tokenMinuteData.save()

  if (token.lastMinuteArchived.equals(ZERO_BI) && token.lastMinuteRecorded.equals(ZERO_BI)) {
    token.lastMinuteRecorded = BigInt.fromI32(minuteIndex)
    token.lastMinuteArchived = BigInt.fromI32(minuteIndex-1)
  }
  if (isNew) {
    let lastMinuteArchived = token.lastMinuteArchived.toI32()
    let stop = minuteIndex - 1680 
    if (stop > lastMinuteArchived) {
      archiveMinuteData(token, stop)
    }

    token.lastMinuteRecorded = BigInt.fromI32(minuteIndex)
    token.save()
  }

  // Rolling deletion segment

  //current minute minus 10800 seconds (28 hours)

  return tokenMinuteData as TokenMinuteData
}

function archiveMinuteData(token: Token, end: i32): void {
  // log.warning('ARCHIVING MINUTE - {}   - TOKEN - {}', [token.lastMinuteArchived.toString(), token.id.toHexString()])
  let length = token.minuteArray.length
  let array = token.minuteArray
  let modArray = token.minuteArray
  let last = token.lastMinuteArchived.toI32()
  for (let i = 0; i < length; i++) {
    if(array[i] > end){
      break
    }
    let tokenMinuteID = token.id
      .concat('-')
      .concat(array[i].toString())
    // let tokenMinuteData = TokenMinuteData.load(tokenMinuteID)
    // if (tokenMinuteData) {
    store.remove('TokenMinuteData', tokenMinuteID)
    // }
    modArray.shift()
    last = array[i]
    if (BigInt.fromI32(i + 1).equals(BigInt.fromI32(1000))) {
      // log.warning('INTERVAL REACH - {} - LIMITER - {}', [tokenMinuteID, i.toString()])
      break
    }
  }
  if (modArray) {
    token.minuteArray = modArray
  } else {
    token.minuteArray = []
  }
  token.lastMinuteArchived = BigInt.fromI32(last - 1)
  token.save()
}

function archiveHourData(token: Token, end: i32): void {
  let length = token.hourArray.length
  
  let array = token.hourArray
  let modArray = token.hourArray
  let last = token.lastHourArchived.toI32()
  for (let i = 0; i < length; i++) {
    if(array[i] > end){
      break
    }
    let tokenHourID = token.id
      .concat('-')
      .concat(array[i].toString())
    // let tokenMinuteData = TokenMinuteData.load(tokenMinuteID)
    // if (tokenMinuteData) {
    store.remove('TokenHourData', tokenHourID)
    // }
    modArray.shift()
    last = array[i]
    if (BigInt.fromI32(i + 1).equals(BigInt.fromI32(500))) {
      // log.warning('INTERVAL REACH - {} - LIMITER - {}', [tokenMinuteID, i.toString()])
      break
    }
  }
  if (modArray) {
    token.hourArray = modArray
  } else {
    token.hourArray = []
  }
  token.lastHourArchived = BigInt.fromI32(last - 1)
  token.save()
}
