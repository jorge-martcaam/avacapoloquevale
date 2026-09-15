const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  `          if (profile && profile.payday) {
            setUserPayday(profile.payday);
            setTempPayday(profile.payday);
          }`,
  `          if (profile && profile.paydayStart) {
            setUserPaydayStart(profile.paydayStart);
            setTempPaydayStart(profile.paydayStart);
          }
          if (profile && profile.paydayEnd) {
            setUserPaydayEnd(profile.paydayEnd);
            setTempPaydayEnd(profile.paydayEnd);
          }`
);

code = code.replace(
  `  const handleSaveSettings = async () => {
    try {
      await updateUserPaydayRange(tempPayday);
      setUserPayday(tempPayday);
      setShowSettingsModal(false);
    } catch (error) {
      console.error("Error saving settings", error);
      alert("Houbo un erro ao gardar a configuración.");
    }
  };`,
  `  const handleSaveSettings = async () => {
    try {
      await updateUserPaydayRange(tempPaydayStart, tempPaydayEnd);
      setUserPaydayStart(tempPaydayStart);
      setUserPaydayEnd(tempPaydayEnd);
      setShowSettingsModal(false);
    } catch (error) {
      console.error("Error saving settings", error);
      alert("Houbo un erro ao gardar a configuración.");
    }
  };`
);

code = code.replace(
  `            <Overview transactions={transactions} userPayday={userPayday} />`,
  `            <Overview transactions={transactions} userPaydayStart={userPaydayStart} userPaydayEnd={userPaydayEnd} />`
);

fs.writeFileSync('src/App.tsx', code);
