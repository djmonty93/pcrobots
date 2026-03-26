local runner_dir = arg[0]:match("^(.*[/\\])") or "./"
package.path = runner_dir .. "?.lua;" .. package.path

local json = require("json")

local source_env = {
  assert = assert,
  error = error,
  ipairs = ipairs,
  math = math,
  next = next,
  pairs = pairs,
  pcall = pcall,
  select = select,
  string = string,
  table = table,
  tonumber = tonumber,
  tostring = tostring,
  type = type,
  utf8 = utf8,
  xpcall = xpcall
}

source_env._G = source_env

local function load_handler(source)
  local chunk, load_error = load(source, "pcrobots-bot.lua", "t", source_env)
  if not chunk then
    error(load_error)
  end

  local returned = chunk()
  local handler = nil

  if type(returned) == "function" then
    handler = returned
  elseif type(source_env.on_turn) == "function" then
    handler = source_env.on_turn
  elseif type(source_env.onTurn) == "function" then
    handler = source_env.onTurn
  end

  if type(handler) ~= "function" then
    error("Lua bot source must return a function or define on_turn(snapshot) / onTurn(snapshot)")
  end

  return handler
end

local function main()
  local payload = json.decode(io.read("*a"))
  local handler = load_handler(payload.source)
  local action = handler(payload.snapshot)
  io.write(json.encode(action))
end

local ok, err = xpcall(main, debug.traceback)
if not ok then
  io.stderr:write(err, "\n")
  os.exit(1)
end
