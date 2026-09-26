import EmbeddedPostgres from "embedded-postgres"

const pg = new EmbeddedPostgres({
  databaseDir: "./.pgdata",
  user: "postgres",
  password: "postgres",
  port: 5433,
  persistent: true,
})

const start = async () => {
  try {
    await pg.initialise()
  } catch {
    /* already initialised */
  }
  await pg.start()
  try {
    await pg.createDatabase("flowcase")
  } catch {
    /* exists */
  }
  console.log("embedded postgres ready on :5433")
}

start().catch((err) => {
  console.error(err)
  process.exit(1)
})
