/**
 * This file exports the Bottleneck library from the global window object.
 * 
 * Bottleneck is a lightweight and zero-dependency task scheduler and rate limiter 
 * for Node.js and the browser.
 * 
 * Usage example:
 * import Bottleneck from './bottleneckWrapper';
 * const limiter = new Bottleneck({
 *   maxConcurrent: 1,
 *   minTime: 333
 * });
 * 
 * limiter.schedule(() => someAsyncTask());
 * 
 * Files that use this:
 * - js/services/apiService.js (likely)
 * - js/controllers/dataController.js (potentially)
 * 
 * Role in overall program logic:
 * This wrapper allows the application to use Bottleneck for rate limiting and 
 * concurrency control in API calls or other resource-intensive operations. 
 * It helps prevent overloading servers or hitting API rate limits by controlling 
 * the flow of requests or tasks.
 */
export default window.Bottleneck;
