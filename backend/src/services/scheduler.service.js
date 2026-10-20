const cron = require('node-cron');
const { fetchNewsNow } = require('./newsFetch.service');
const { generateDailyDigest } = require('../jobs/dailyDigest.job');

/**
 * Wires up the two recurring jobs shown in the activity diagram:
 *  - FetchNews, every 30 minutes
 *  - GenerateDailyDigest, once per day
 */
function startScheduler() {
  const intervalMinutes = parseInt(process.env.FETCH_INTERVAL_MINUTES || '30', 10);

  // Every N minutes (default 30)
  cron.schedule(`*/${intervalMinutes} * * * *`, async () => {
    try {
      console.log('[scheduler] Running scheduled news fetch...');
      const result = await fetchNewsNow();
      console.log('[scheduler] Fetch complete:', result);
    } catch (err) {
      console.error('[scheduler] News fetch failed:', err.message);
    }
  });

  // Once per day at 06:00 server time
  cron.schedule('0 6 * * *', async () => {
    try {
      console.log('[scheduler] Generating daily digest...');
      await generateDailyDigest();
    } catch (err) {
      console.error('[scheduler] Digest generation failed:', err.message);
    }
  });

  console.log(`[scheduler] Started (fetch every ${intervalMinutes}m, digest daily at 06:00)`);
}

module.exports = { startScheduler };
