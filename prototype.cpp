#include <iostream>
#include <string>
using namespace std;

// User defined Data Types
struct UserName{
    string fname;
    string lname;
};
struct dob{
    int date;
    int month;
    int year;
};
class user{
    private:
        string password;
        user* next;
        user* prev;
    protected:
        int department = -1;
        int designation = -1;
        dob dateOfbirth;
        long int phone_number;
    public:
        int userType = 1;
        UserName name;
        string ID;
        string email;
        //friend int emailFunction(user* currectUser, int functionType);
};