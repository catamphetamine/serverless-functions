async function $finally() {
	// Doesn't work, see the github issue for more info.
  // // Fixes Sequelize connection pool preventing Node.js process from terminating.
  // // https://github.com/sequelize/sequelize/issues/8468#issuecomment-410451242
  // const pool = sequelize.connectionManager.pool
  // if (pool) {
  //   // After calling "pool.drain()" the pool seems to be unusable
  //   // so next time when the Lambda gets reused
  //   // (next request comes shortly after the previous one)
  //   // it throws "pool is draining and cannot accept work".
  //   // https://github.com/coopernurse/node-pool#draining
  //   await pool.drain()
  //   await pool.clear()
  // }
}