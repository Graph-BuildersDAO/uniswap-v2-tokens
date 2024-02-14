/* eslint-disable prefer-const */
import { log, BigInt, ethereum, Address } from '@graphprotocol/graph-ts'
import { PairCreated } from '../types/Factory/Factory'
import { Bundle, Pair, PairTokenLookup, Token, UniswapFactory } from '../types/schema'
import { Pair as PairTemplate } from '../types/templates'
import {
  convertTokenToDecimal,
  FACTORY_ADDRESS,
  factoryContract,
  fetchTokenDecimals,
  fetchTokenName,
  fetchTokenSymbol,
  fetchTokenTotalSupply,
  ZERO_BD,
  ZERO_BI,
} from './helpers'
import { Pair as PairContract } from '../types/FactoryHydrate/Pair'
import { ERC20 } from '../types/Factory/ERC20'

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

  let pair = Pair.load(event.params.pair.toHexString())

  if (!pair) {
    pair = new Pair(event.params.pair.toHexString()) as Pair
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

  let pairCount = factory.pairCount
  for (let i = 0; i < 1000; i++) {
    let index = BigInt.fromI32(i).plus(BigInt.fromI32(pairCount))

    let pairAddress = factoryContract.try_allPairs(index)

    if (!pairAddress.reverted) {
      let pairContract = PairContract.bind(pairAddress.value)

      let try_token0 = pairContract.try_token0()
      let try_token1 = pairContract.try_token1()

      if(!try_token0.reverted && !try_token1.reverted) {
      let token0_id = try_token0.value
      let token1_id = try_token1.value
      // create the tokens
      let token0 = Token.load(token0_id.toHexString())
      let token1 = Token.load(token1_id.toHexString())

      // fetch info if null
      if (!token0) {
        token0 = new Token(token0_id.toHexString())
        token0.symbol = fetchTokenSymbol(token0_id)
        token0.name = fetchTokenName(token0_id)
        token0.totalSupply = fetchTokenTotalSupply(token0_id)
        let decimals = fetchTokenDecimals(token0_id)

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
        token1 = new Token(token1_id.toHexString())
        token1.symbol = fetchTokenSymbol(token1_id)
        token1.name = fetchTokenName(token1_id)
        token1.totalSupply = fetchTokenTotalSupply(token1_id)
        let decimals = fetchTokenDecimals(token1_id)

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

      let pair = Pair.load(pairAddress.value.toHexString())
      if (!pair) {
        pair = new Pair(pairAddress.value.toHexString())
        pair.token0 = token0.id
        pair.token1 = token1.id
        pair.liquidityProviderCount = ZERO_BI
        pair.createdAtTimestamp = block.timestamp
        pair.createdAtBlockNumber = block.number
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

        pair.save()

        pairCount = pairCount + 1

        let token0Contract = ERC20.bind(Address.fromString(token0.id))
        let token1Contract = ERC20.bind(Address.fromString(token0.id))

        let try_balance0 = token0Contract.try_balanceOf(Address.fromString(pair.id))
        let try_balance1 = token1Contract.try_balanceOf(Address.fromString(pair.id))

        if (!try_balance0.reverted) {
          token0.totalLiquidity = token0.totalLiquidity.plus(convertTokenToDecimal(try_balance0.value, token0.decimals))
        }

        if (!try_balance1.reverted) {
          token1.totalLiquidity = token1.totalLiquidity.plus(convertTokenToDecimal(try_balance1.value, token0.decimals))
        }

        let pairLookup0 = new PairTokenLookup(token0.id.concat('-').concat(token1.id))
        pairLookup0.pair = pair.id
        pairLookup0.save()

        let pairLookup1 = new PairTokenLookup(token1.id.concat('-').concat(token0.id))
        pairLookup1.pair = pair.id
        pairLookup1.save()

        PairTemplate.create(Address.fromString(pair.id))
      }

      token0.save()
      token1.save()
    }}
  }

  factory.pairCount = pairCount
  factory.save()
}
