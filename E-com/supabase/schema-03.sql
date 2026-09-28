-- Login throttle as SECURITY DEFINER functions so the anon key can check +
-- record attempts without ever reading the attempts table (no IP leakage).
-- Call check_login_throttle(ip) BEFORE verifying the password; call
-- clear_login_throttle(ip) after a successful login.

create or replace function check_login_throttle(p_ip text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  fails int;
begin
  if p_ip is null or p_ip = '' then
    return json_build_object('allowed', false);
  end if;
  delete from login_attempts where attempted_at < now() - interval '1 hour';
  select count(*) into fails from login_attempts
    where ip = p_ip and success = false and attempted_at > now() - interval '10 minutes';
  if fails >= 5 then
    return json_build_object('allowed', false, 'remaining', 0);
  end if;
  insert into login_attempts (ip, success) values (p_ip, false);
  return json_build_object('allowed', true, 'remaining', 5 - fails - 1);
end;
$$;

create or replace function clear_login_throttle(p_ip text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from login_attempts where ip = p_ip;
end;
$$;

revoke all on function check_login_throttle(text) from public;
revoke all on function clear_login_throttle(text) from public;
grant execute on function check_login_throttle(text) to anon;
grant execute on function clear_login_throttle(text) to anon;
