-- Create the delete_user_complete function
create or replace function public.delete_user_complete(user_email text)
returns void
language plpgsql
security definer
as $$
begin
  -- Delete from auth.users
  delete from auth.users where email = user_email;
  
  -- Delete from auth.identities
  delete from auth.identities where email = user_email;
  
  -- Delete from auth.sessions
  delete from auth.sessions 
  where user_id in (
    select id from auth.users where email = user_email
  );
end;
$$;
