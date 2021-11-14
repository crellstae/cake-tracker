module.exports = {
  generateGUID: () => { 
    return Math.floor((Math.random()) * 0x10000).toString(16)
  },
  diffBetweeenDatesInSeconds: (endDate, startDate) => {
    const diffTime = (endDate.getTime() - startDate.getTime()) / 1000;

    return diffTime;
  }
}