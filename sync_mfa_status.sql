-- Function to sync MFA status from auth.factors to user_info
CREATE OR REPLACE FUNCTION public.sync_mfa_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update user_info mfa_enabled based on auth.factors status
    UPDATE public.user_info
    SET mfa_enabled = EXISTS (
        SELECT 1
        FROM auth.factors
        WHERE user_id = user_info.id
        AND factor_type = 'totp'
        AND status = 'verified'
    )
    WHERE id = NEW.user_id OR id = OLD.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_factor_change ON auth.factors;

-- Create trigger to run on any change to auth.factors
CREATE TRIGGER on_factor_change
    AFTER INSERT OR UPDATE OR DELETE ON auth.factors
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_mfa_status();

-- Initial sync of all users' MFA status
UPDATE public.user_info
SET mfa_enabled = EXISTS (
    SELECT 1
    FROM auth.factors
    WHERE user_id = user_info.id
    AND factor_type = 'totp'
    AND status = 'verified'
);
