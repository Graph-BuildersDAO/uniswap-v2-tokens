/* eslint-disable prefer-const */
import { log, BigInt, ethereum, Address } from '@graphprotocol/graph-ts'
import { PairCreated } from '../types/Factory/Factory'
import { Bundle, Pair, PairTokenLookup, Token, UniswapFactory } from '../types/schema'
import { Pair as PairTemplate } from '../types/templates'
import {
  convertTokenToDecimal,
  FACTORY_ADDRESS,
  fetchTokenDecimals,
  fetchTokenName,
  fetchTokenSymbol,
  fetchTokenTotalSupply,
  ZERO_BD,
  ZERO_BI,
} from './helpers'
import { PairBasic } from '../Utils/pair_hydrate'
import { Pair as PairContract } from '../types/templates'

export function handleNewPair(event: PairCreated): void {
  // load factory (create if first exchange)
  let factory = UniswapFactory.load(FACTORY_ADDRESS)
  if (!factory) {
    factory = new UniswapFactory(FACTORY_ADDRESS)
    factory.pairCount = 0
    factory.totalVolumeETH = ZERO_BD
    factory.totalLiquidityETH = ZERO_BD
    factory.totalVolumeUSD = ZERO_BD
    factory.untrackedVolumeUSD = ZERO_BD
    factory.totalLiquidityUSD = ZERO_BD
    factory.txCount = ZERO_BI

    // create new bundle
    let bundle = new Bundle('1')
    bundle.ethPrice = ZERO_BD
    bundle.save()
  }
  factory.pairCount = factory.pairCount + 1
  factory.save()

  // create the tokens
  let token0 = Token.load(event.params.token0.toHexString())
  let token1 = Token.load(event.params.token1.toHexString())

  // fetch info if null
  if (!token0) {
    token0 = new Token(event.params.token0.toHexString())
    token0.symbol = fetchTokenSymbol(event.params.token0)
    token0.name = fetchTokenName(event.params.token0)
    token0.totalSupply = fetchTokenTotalSupply(event.params.token0)
    let decimals = fetchTokenDecimals(event.params.token0)

    // bail if we couldn't figure out the decimals
    if (!decimals) {
      log.debug('mybug the decimal on token 0 was null', [])
      return
    }

    token0.decimals = decimals
    token0.derivedETH = ZERO_BD
    token0.tradeVolume = ZERO_BD
    token0.tradeVolumeUSD = ZERO_BD
    token0.untrackedVolumeUSD = ZERO_BD
    token0.totalLiquidity = ZERO_BD
    token0.lastMinuteArchived = BigInt.fromI32(0)
    token0.lastHourArchived = BigInt.fromI32(0)
    token0.lastMinuteRecorded = BigInt.fromI32(0)
    token0.lastHourRecorded = BigInt.fromI32(0)
    token0.minuteArray = []
    token0.hourArray = []
    // token0.allPairs = []
    token0.txCount = ZERO_BI
  }

  // fetch info if null
  if (!token1) {
    token1 = new Token(event.params.token1.toHexString())
    token1.symbol = fetchTokenSymbol(event.params.token1)
    token1.name = fetchTokenName(event.params.token1)
    token1.totalSupply = fetchTokenTotalSupply(event.params.token1)
    let decimals = fetchTokenDecimals(event.params.token1)

    // bail if we couldn't figure out the decimals
    if (!decimals) {
      return
    }
    token1.decimals = decimals
    token1.derivedETH = ZERO_BD
    token1.tradeVolume = ZERO_BD
    token1.tradeVolumeUSD = ZERO_BD
    token1.untrackedVolumeUSD = ZERO_BD
    token1.totalLiquidity = ZERO_BD
    token1.lastMinuteArchived = BigInt.fromI32(0)
    token1.lastHourArchived = BigInt.fromI32(0)
    token1.lastMinuteRecorded = BigInt.fromI32(0)
    token1.lastHourRecorded = BigInt.fromI32(0)
    token1.minuteArray = []
    token1.hourArray = []
    // token1.allPairs = []
    token1.txCount = ZERO_BI
  }

  let pair = new Pair(event.params.pair.toHexString()) as Pair
  pair.token0 = token0.id
  pair.token1 = token1.id
  pair.liquidityProviderCount = ZERO_BI
  pair.createdAtTimestamp = event.block.timestamp
  pair.createdAtBlockNumber = event.block.number
  pair.txCount = ZERO_BI
  pair.reserve0 = ZERO_BD
  pair.reserve1 = ZERO_BD
  pair.trackedReserveETH = ZERO_BD
  pair.reserveETH = ZERO_BD
  pair.reserveUSD = ZERO_BD
  pair.totalSupply = ZERO_BD
  pair.volumeToken0 = ZERO_BD
  pair.volumeToken1 = ZERO_BD
  pair.volumeUSD = ZERO_BD
  pair.untrackedVolumeUSD = ZERO_BD
  pair.token0Price = ZERO_BD
  pair.token1Price = ZERO_BD
  token0.save()
  token1.save()
  pair.save()
  factory.save()

  let pairLookup0 = new PairTokenLookup(
    event.params.token0.toHexString().concat('-').concat(event.params.token1.toHexString()),
  )
  pairLookup0.pair = pair.id
  pairLookup0.save()

  let pairLookup1 = new PairTokenLookup(
    event.params.token1.toHexString().concat('-').concat(event.params.token0.toHexString()),
  )
  pairLookup1.pair = pair.id
  pairLookup1.save()

  // create the tracked contract based on the template
  PairTemplate.create(event.params.pair)

  // save updated values
}

export function handleHydrateStore(block: ethereum.Block): void {
  let factory = UniswapFactory.load(FACTORY_ADDRESS)
  if (!factory) {
    factory = new UniswapFactory(FACTORY_ADDRESS)
    factory.pairCount = 0
    factory.totalVolumeETH = ZERO_BD
    factory.totalLiquidityETH = ZERO_BD
    factory.totalVolumeUSD = ZERO_BD
    factory.untrackedVolumeUSD = ZERO_BD
    factory.totalLiquidityUSD = ZERO_BD
    factory.txCount = ZERO_BI

    // create new bundle
    let bundle = new Bundle('1')
    bundle.ethPrice = ZERO_BD
    bundle.save()
  }

  factory.pairCount = factory.pairCount + 1
  factory.save()

  //Start the big loop
  let pairs = PairBasic.getExistingPairs()

  for (let i = 0; i < pairs.length; i++) {
    let newPair = pairs[i]

    factory.pairCount = factory.pairCount + 1
    factory.save()

    // create the tokens
    let token0 = Token.load(newPair.token_0)
    let token1 = Token.load(newPair.token_1)

    // fetch info if null
    if (!token0) {
      token0 = new Token(newPair.token_0)
      token0.symbol = fetchTokenSymbol(Address.fromString(newPair.token_0))
      token0.name = fetchTokenName(Address.fromString(newPair.token_0))
      token0.totalSupply = fetchTokenTotalSupply(Address.fromString(newPair.token_0))
      let decimals = fetchTokenDecimals(Address.fromString(newPair.token_0))

      // bail if we couldn't figure out the decimals
      if (!decimals) {
        log.debug('mybug the decimal on token 0 was null', [])
        return
      }

      token0.decimals = decimals
      token0.derivedETH = ZERO_BD
      token0.tradeVolume = ZERO_BD
      token0.tradeVolumeUSD = ZERO_BD
      token0.untrackedVolumeUSD = ZERO_BD
      token0.totalLiquidity = ZERO_BD
      token0.lastMinuteArchived = BigInt.fromI32(0)
      token0.lastHourArchived = BigInt.fromI32(0)
      token0.lastMinuteRecorded = BigInt.fromI32(0)
      token0.lastHourRecorded = BigInt.fromI32(0)
      token0.minuteArray = []
      token0.hourArray = []
      // token0.allPairs = []
      token0.txCount = ZERO_BI
      token0.save()
    }

    // fetch info if null
    if (!token1) {
      token1 = new Token(newPair.token_1)
      token1.symbol = fetchTokenSymbol(Address.fromString(newPair.token_1))
      token1.name = fetchTokenName(Address.fromString(newPair.token_1))
      token1.totalSupply = fetchTokenTotalSupply(Address.fromString(newPair.token_1))
      let decimals = fetchTokenDecimals(Address.fromString(newPair.token_1))

      // bail if we couldn't figure out the decimals
      if (!decimals) {
        return
      }
      token1.decimals = decimals
      token1.derivedETH = ZERO_BD
      token1.tradeVolume = ZERO_BD
      token1.tradeVolumeUSD = ZERO_BD
      token1.untrackedVolumeUSD = ZERO_BD
      token1.totalLiquidity = ZERO_BD
      token1.lastMinuteArchived = BigInt.fromI32(0)
      token1.lastHourArchived = BigInt.fromI32(0)
      token1.lastMinuteRecorded = BigInt.fromI32(0)
      token1.lastHourRecorded = BigInt.fromI32(0)
      token1.minuteArray = []
      token1.hourArray = []
      // token1.allPairs = []
      token1.txCount = ZERO_BI

      token1.save()
    }

    let pair = Pair.load(newPair.id)
    if (!pair) {
      let pairContract = PairContract.bind(Address.fromString(newPair.id))

      let try_reserves = pairContract.try_reserves()

      let reserve0 = ZERO_BD
      let reserve1 = ZERO_BD

      if (!try_reserves.reverted) {
        reserve0 = convertTokenToDecimal(try_reserves.value0, token0.decimals)
        reserve1 = convertTokenToDecimal(try_reserves.value1, token1.decimals)
      }

      pair = new Pair(newPair.id)
      pair.token0 = token0.id
      pair.token1 = token1.id
      pair.liquidityProviderCount = ZERO_BI
      pair.createdAtTimestamp = BigInt.fromI32(newPair.created_at_timestamp)
      pair.createdAtBlockNumber = BigInt.fromI32(newPair.created_at_timestamp)
      pair.txCount = ZERO_BI
      pair.reserve0 = reserve0
      pair.reserve1 = reserve1
      pair.trackedReserveETH = ZERO_BD
      pair.reserveETH = ZERO_BD
      pair.reserveUSD = ZERO_BD
      pair.totalSupply = ZERO_BD
      pair.volumeToken0 = ZERO_BD
      pair.volumeToken1 = ZERO_BD
      pair.volumeUSD = ZERO_BD
      pair.untrackedVolumeUSD = ZERO_BD
      pair.token0Price = ZERO_BD
      pair.token1Price = ZERO_BD

      pair.save()

      let pairLookup0 = new PairTokenLookup(newPair.token_0.concat('-').concat(newPair.token_1))
      pairLookup0.pair = pair.id
      pairLookup0.save()

      let pairLookup1 = new PairTokenLookup(newPair.token_1.concat('-').concat(newPair.token_0))
      pairLookup1.pair = pair.id
      pairLookup1.save()
    }
  }

  factory.save()
}
