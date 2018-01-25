import Bucket, { BucketCategory } from './Bucket'
import Metrics, { calculateMetrics } from './Metrics'

export interface IBucketListOptions {
  windowDuration: number,
  numBuckets: number
}

export { BucketCategory, Bucket }

export default class BucketList {
  private buckets: Bucket[] = [new Bucket()]
  private numBuckets: number
  private bucketDuration: number

  constructor (options: IBucketListOptions, private onNewRuntimeCollected: () => void) {
    if (options.numBuckets <= 0) {
      throw new Error(`Expect "numBuckets" to be positive, got ${options.numBuckets}`)
    }

    this.numBuckets = options.numBuckets
    this.bucketDuration = options.windowDuration / options.numBuckets
  }

  get currentBucket (): Bucket {
    this.maybeAddBucket()
    return this.buckets[this.buckets.length - 1]
  }

  get latestResponseTime (): number {
    const { runTimes } = this.currentBucket
    return runTimes.length === 0 ? 0 : runTimes[runTimes.length - 1]
  }

  /**
   * Collect the result of a request
   *
   * @param {BucketCategory} category the category of the result
   * @param {number} runtime the runtime of the result
   * @memberof BucketList
   */
  public collect (category: BucketCategory, runtime: number): void {
    const { currentBucket, onNewRuntimeCollected } = this
    currentBucket.increaseValue(category)
    currentBucket.runTimes.push(runtime)
    onNewRuntimeCollected()
  }

  public getMetrics (): Metrics {
    return calculateMetrics(this.buckets)
  }

  public getSortedRuntimes (): number[] {
    return this.buckets
      .reduce((logs: number[], bucket) => logs.concat(bucket.runTimes), [])
      .sort((x, y) => x - y)
  }

  public reset (): void {
    this.buckets = [new Bucket()]
  }

  private maybeAddBucket (): void {
    const timeDiff = Date.now() - this.buckets[this.buckets.length - 1].startedAt
    if (timeDiff > this.bucketDuration) {
      const shouldAddAmount = Math.floor(timeDiff / this.bucketDuration)
      const currentAmount = this.buckets.length
      const outOfAmount = currentAmount + shouldAddAmount - this.numBuckets
      const removeAmount = outOfAmount > this.numBuckets ? this.numBuckets : outOfAmount
      if (removeAmount > 0) {
        this.buckets.splice(0, removeAmount)
      }
      const addAmount = removeAmount > 0 ? removeAmount : shouldAddAmount
      for (let i = 0; i < addAmount; i++) {
        this.buckets.push(new Bucket())
      }
    }
  }
}
